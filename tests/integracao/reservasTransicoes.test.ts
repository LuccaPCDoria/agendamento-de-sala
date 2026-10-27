import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { criarApp } from '../../server/app';
import { criarTransacao } from '../../server/lib/db';
import { criarServicoReservas } from '../../server/services/reservas';
import {
  criarSalaTeste, criarUsuarioTeste, depsIntegracao, encerrarConexoes, limparBanco, novoClienteSql, sqlTeste,
} from './ajuda';

const extras: ReturnType<typeof novoClienteSql>[] = [];
beforeEach(limparBanco);
afterAll(async () => {
  await limparBanco();
  await Promise.all(extras.map((c) => c.end()));
  await encerrarConexoes();
});

const app = () => criarApp(depsIntegracao());
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

async function inserirReserva(usuarioId: string, salaId: string, status: string, dias: number) {
  const inicio = new Date(Date.now() + dias * 86400000);
  const fim = new Date(inicio.getTime() + 3600000);
  const [r] = await sqlTeste<{ id: string }[]>`
    insert into reservas (sala_id, usuario_id, inicio, fim, status, finalidade)
    values (${salaId}, ${usuarioId}, ${inicio}, ${fim}, ${status}, 'Aula') returning id`;
  return r.id;
}

describe('transições de reservas', () => {
  it('admin aprova pendente (200) e grava histórico; professor cancela a própria', async () => {
    const adm = await criarUsuarioTeste('admin');
    const prof = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const id = await inserirReserva(prof.perfil.id, sala.id, 'pendente', 5);
    const a = await request(app()).post(`/api/reservas/${id}/aprovar`).set(auth(adm.token));
    expect(a.status).toBe(200);
    expect(a.body.status).toBe('aprovada');
    const c = await request(app()).post(`/api/reservas/${id}/cancelar`).set(auth(prof.token));
    expect(c.status).toBe(200);
    expect(c.body.status).toBe('cancelada');
    const h = await sqlTeste`select status_anterior, status_novo from historico_reservas where reserva_id = ${id} order by alterado_em, id`;
    expect(h.map((x) => [x.statusAnterior, x.statusNovo])).toEqual([['pendente', 'aprovada'], ['aprovada', 'cancelada']]);
  });
  it('recusar grava motivo; motivo vazio → 400', async () => {
    const adm = await criarUsuarioTeste('admin');
    const prof = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const id = await inserirReserva(prof.perfil.id, sala.id, 'pendente', 5);
    expect((await request(app()).post(`/api/reservas/${id}/recusar`).set(auth(adm.token)).send({ motivo: ' ' })).status).toBe(400);
    const r = await request(app()).post(`/api/reservas/${id}/recusar`).set(auth(adm.token)).send({ motivo: 'Sem vaga' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: 'recusada', motivoRecusa: 'Sem vaga' });
  });
  it('professor cancela reserva alheia → 403; professor não aprova → 403', async () => {
    const dono = await criarUsuarioTeste('usuario');
    const outro = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const id = await inserirReserva(dono.perfil.id, sala.id, 'pendente', 5);
    expect((await request(app()).post(`/api/reservas/${id}/cancelar`).set(auth(outro.token))).status).toBe(403);
    expect((await request(app()).post(`/api/reservas/${id}/aprovar`).set(auth(outro.token))).status).toBe(403);
  });
  it('recusar reserva expirada → 409', async () => {
    const adm = await criarUsuarioTeste('admin');
    const prof = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const id = await inserirReserva(prof.perfil.id, sala.id, 'pendente', -2);
    const res = await request(app()).post(`/api/reservas/${id}/recusar`).set(auth(adm.token)).send({ motivo: 'x' });
    expect(res.status).toBe(409);
    expect(res.body.erro).toBe('Esta reserva não pode mais ser alterada.');
  });
  it('aprovar com sala inativa → 409', async () => {
    const adm = await criarUsuarioTeste('admin');
    const prof = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const id = await inserirReserva(prof.perfil.id, sala.id, 'pendente', 5);
    await sqlTeste`update salas set ativa = false where id = ${sala.id}`;
    expect((await request(app()).post(`/api/reservas/${id}/aprovar`).set(auth(adm.token))).status).toBe(409);
  });
  it('id inexistente → 404; id inválido → 404 "Reserva não encontrada."', async () => {
    const prof = await criarUsuarioTeste('usuario');
    const res = await request(app()).post('/api/reservas/abc/cancelar').set(auth(prof.token));
    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('Reserva não encontrada.');
    const r2 = await request(app()).post('/api/reservas/00000000-0000-4000-8000-000000000000/cancelar').set(auth(prof.token));
    expect(r2.status).toBe(404);
  });
  // aprovar x cancelar não é exclusivo: aprovada → cancelada em série é válido; por isso o par exclusivo é aprovar x recusar.
  it('aprovar e recusar simultâneos (dois clientes) → exatamente um vence', async () => {
    const adm = await criarUsuarioTeste('admin');
    const prof = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const id = await inserirReserva(prof.perfil.id, sala.id, 'pendente', 5);
    const [a, b] = [novoClienteSql(), novoClienteSql()];
    extras.push(a, b);
    const servA = criarServicoReservas({ ...depsIntegracao(), transacao: criarTransacao(a) });
    const servB = criarServicoReservas({ ...depsIntegracao(), transacao: criarTransacao(b) });
    const r = await Promise.allSettled([servA.aprovar(adm.perfil, id), servB.recusar(adm.perfil, id, 'Sem vaga')]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(r.find((x) => x.status === 'rejected')!.reason).toMatchObject({ status: 409 });
    const h = await sqlTeste`select status_anterior from historico_reservas where reserva_id = ${id}`;
    expect(h).toHaveLength(1);
  }, 20_000);
  it('aprovar × cancelar simultâneos: cadeia de histórico consistente', async () => {
    const adm = await criarUsuarioTeste('admin');
    const prof = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const id = await inserirReserva(prof.perfil.id, sala.id, 'pendente', 5);
    await sqlTeste`insert into historico_reservas (reserva_id, status_anterior, status_novo, alterado_por)
      values (${id}, null, 'pendente', ${prof.perfil.id})`;
    const [a, b] = [novoClienteSql(), novoClienteSql()];
    extras.push(a, b);
    const servA = criarServicoReservas({ ...depsIntegracao(), transacao: criarTransacao(a) });
    const servB = criarServicoReservas({ ...depsIntegracao(), transacao: criarTransacao(b) });
    await Promise.allSettled([servA.aprovar(adm.perfil, id), servB.cancelar(prof.perfil, id)]);
    const h = await sqlTeste<{ statusAnterior: string | null; statusNovo: string }[]>`
      select status_anterior, status_novo from historico_reservas where reserva_id = ${id} order by alterado_em, id`;
    expect(h.length).toBeGreaterThanOrEqual(2);
    expect(h[0]).toMatchObject({ statusAnterior: null, statusNovo: 'pendente' });
    for (let i = 1; i < h.length; i++) expect(h[i].statusAnterior).toBe(h[i - 1].statusNovo);
  }, 20_000);
});
