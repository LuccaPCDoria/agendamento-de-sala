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

/** Data futura (≥ 7 dias), de segunda a sábado, 10:00–11:00 em São Paulo (-03:00). */
function janela() {
  const d = new Date(Date.now() + 7 * 86400000);
  for (;;) {
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
    const dia = new Date(`${ymd}T12:00:00-03:00`).getUTCDay();
    if (dia !== 0) return { inicio: `${ymd}T10:00:00-03:00`, fim: `${ymd}T11:00:00-03:00` };
    d.setDate(d.getDate() + 1);
  }
}

describe('POST /api/reservas', () => {
  it('professor cria reserva pendente (201) e grava histórico', async () => {
    const { token, perfil } = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const res = await request(app()).post('/api/reservas').set(auth(token))
      .send({ salaId: sala.id, ...janela(), finalidade: 'Aula' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'pendente', salaId: sala.id, usuarioId: perfil.id });
    const h = await sqlTeste`select status_anterior, status_novo from historico_reservas where reserva_id = ${res.body.id}`;
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ statusAnterior: null, statusNovo: 'pendente' });
  });
  it('admin cria reserva aprovada', async () => {
    const { token } = await criarUsuarioTeste('admin');
    const sala = await criarSalaTeste();
    const res = await request(app()).post('/api/reservas').set(auth(token))
      .send({ salaId: sala.id, ...janela(), finalidade: 'Aula' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('aprovada');
  });
  it('POST com data sem offset → 400 "Data e hora inválidas."', async () => {
    const { token } = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const res = await request(app()).post('/api/reservas').set(auth(token))
      .send({ salaId: sala.id, inicio: '2030-01-07T10:00:00', fim: '2030-01-07T11:00:00', finalidade: 'Aula' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Data e hora inválidas.');
  });
  it('conflito → 409 "Esta sala já está reservada nesse horário."', async () => {
    const p1 = await criarUsuarioTeste('usuario');
    const p2 = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const corpo = { salaId: sala.id, ...janela(), finalidade: 'Aula' };
    expect((await request(app()).post('/api/reservas').set(auth(p1.token)).send(corpo)).status).toBe(201);
    const res = await request(app()).post('/api/reservas').set(auth(p2.token)).send(corpo);
    expect(res.status).toBe(409);
    expect(res.body.erro).toBe('Esta sala já está reservada nesse horário.');
  });
  it('duas criações simultâneas, dois clientes postgres → exatamente uma aceita', async () => {
    const p1 = await criarUsuarioTeste('usuario');
    const p2 = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const [a, b] = [novoClienteSql(), novoClienteSql()];
    extras.push(a, b);
    const servA = criarServicoReservas({ ...depsIntegracao(), transacao: criarTransacao(a) });
    const servB = criarServicoReservas({ ...depsIntegracao(), transacao: criarTransacao(b) });
    const dados = { salaId: sala.id, ...janela(), finalidade: 'Aula' };
    const r = await Promise.allSettled([servA.criar(p1.perfil, dados), servB.criar(p2.perfil, dados)]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(r.find((x) => x.status === 'rejected')!.reason).toMatchObject({ code: '23P01' });
  });
});
