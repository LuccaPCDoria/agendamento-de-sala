import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';
import { criarApp } from '../../server/app';
import { criarSalaTeste, criarUsuarioTeste, depsIntegracao, encerrarConexoes, limparBanco, sqlTeste } from './ajuda';

beforeEach(limparBanco);
afterAll(async () => {
  await limparBanco();
  await encerrarConexoes();
});

const app = () => criarApp(depsIntegracao());
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const clienteAnon = () =>
  createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

async function inserirReserva(salaId: string, usuarioId: string, status: string, inicio: string) {
  const [r] = await sqlTeste<{ id: string }[]>`
    insert into reservas (sala_id, usuario_id, inicio, fim, status, finalidade)
    values (${salaId}, ${usuarioId}, ${inicio}::timestamptz, ${inicio}::timestamptz + interval '1 hour', ${status}, 'teste')
    returning id`;
  return r.id;
}
const statusDe = async (id: string) => (await sqlTeste<{ status: string }[]>`select status from reservas where id = ${id}`)[0].status;

describe('inativação de salas', () => {
  it('cancela só futuras pendentes/aprovadas e grava histórico com o admin', async () => {
    const adm = await criarUsuarioTeste('admin');
    const prof = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const outra = await criarSalaTeste();
    const fut = (d: number, h = 10) => `${new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)}T${h}:00:00Z`;
    const pend = await inserirReserva(sala.id, prof.perfil.id, 'pendente', fut(10));
    const apro = await inserirReserva(sala.id, prof.perfil.id, 'aprovada', fut(11));
    const recu = await inserirReserva(sala.id, prof.perfil.id, 'recusada', fut(12));
    const passada = await inserirReserva(sala.id, prof.perfil.id, 'aprovada', '2020-01-06T10:00:00Z');
    const deOutra = await inserirReserva(outra.id, prof.perfil.id, 'aprovada', fut(13));

    const res = await request(app()).post(`/api/salas/${sala.id}/inativar`).set(auth(adm.token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: sala.id, ativa: false });
    expect(await statusDe(pend)).toBe('cancelada');
    expect(await statusDe(apro)).toBe('cancelada');
    expect(await statusDe(recu)).toBe('recusada');
    expect(await statusDe(passada)).toBe('aprovada');
    expect(await statusDe(deOutra)).toBe('aprovada');
    const hist = await sqlTeste<{ reservaId: string; statusAnterior: string; statusNovo: string; alteradoPor: string }[]>`
      select reserva_id, status_anterior, status_novo, alterado_por from historico_reservas
      where reserva_id in ${sqlTeste([pend, apro, recu, passada, deOutra])}`;
    expect(hist).toHaveLength(2);
    expect(hist.map((h) => [h.statusAnterior, h.statusNovo, h.alteradoPor]).sort()).toEqual([
      ['aprovada', 'cancelada', adm.perfil.id],
      ['pendente', 'cancelada', adm.perfil.id],
    ]);

    const rea = await request(app()).post(`/api/salas/${sala.id}/reativar`).set(auth(adm.token));
    expect(rea.status).toBe(200);
    expect(rea.body.ativa).toBe(true);
    expect(await statusDe(pend)).toBe('cancelada');
  });
  it('só admin; id inválido ou inexistente → 404', async () => {
    const adm = await criarUsuarioTeste('admin');
    const prof = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    expect((await request(app()).post(`/api/salas/${sala.id}/inativar`).set(auth(prof.token))).status).toBe(403);
    expect((await request(app()).post(`/api/salas/${sala.id}/reativar`).set(auth(prof.token))).status).toBe(403);
    const inv = await request(app()).post('/api/salas/xxx/inativar').set(auth(adm.token));
    expect(inv.status).toBe(404);
    expect(inv.body.erro).toBe('Sala não encontrada.');
    const inex = await request(app()).post('/api/salas/00000000-0000-4000-8000-000000000000/inativar').set(auth(adm.token));
    expect(inex.status).toBe(404);
  });
});

describe('inativação de usuários', () => {
  it('login seguinte é recusado e /api/me → 403; reservas futuras canceladas', async () => {
    const adm = await criarUsuarioTeste('admin');
    const prof = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const futura = await inserirReserva(sala.id, prof.perfil.id, 'aprovada', `${new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10)}T10:00:00Z`);

    const res = await request(app()).post(`/api/usuarios/${prof.perfil.id}/inativar`).set(auth(adm.token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: prof.perfil.id, ativo: false });
    expect(await statusDe(futura)).toBe('cancelada');
    // Token de conta bloqueada é rejeitado pelo Auth (401); perfil inativo com token válido → 403.
    expect((await request(app()).get('/api/me').set(auth(prof.token))).status).toBe(401);
    const outro = await criarUsuarioTeste('usuario');
    await sqlTeste`update perfis set ativo = false where id = ${outro.perfil.id}`;
    expect((await request(app()).get('/api/me').set(auth(outro.token))).status).toBe(403);
    const { error } = await clienteAnon().auth.signInWithPassword({ email: prof.perfil.email, password: 'qualquer' });
    expect(error).not.toBeNull();
  });
  it('admin não inativa a si mesmo → 400', async () => {
    const adm = await criarUsuarioTeste('admin');
    const res = await request(app()).post(`/api/usuarios/${adm.perfil.id}/inativar`).set(auth(adm.token));
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Você não pode inativar a sua própria conta.');
  });
  it('reativar usuário volta a permitir login', async () => {
    const adm = await criarUsuarioTeste('admin');
    const email = `reativar-${Date.now()}@teste.local`;
    const senha = 'senha-segura-123';
    const criado = await request(app()).post('/api/usuarios').set(auth(adm.token)).send({ nome: 'Prof', email, senha, papel: 'usuario' });
    expect(criado.status).toBe(201);
    const id = criado.body.id as string;
    expect((await request(app()).post(`/api/usuarios/${id}/inativar`).set(auth(adm.token))).status).toBe(200);
    const bloqueado = await clienteAnon().auth.signInWithPassword({ email, password: senha });
    expect(bloqueado.error).not.toBeNull();
    const rea = await request(app()).post(`/api/usuarios/${id}/reativar`).set(auth(adm.token));
    expect(rea.status).toBe(200);
    expect(rea.body.ativo).toBe(true);
    const ok = await clienteAnon().auth.signInWithPassword({ email, password: senha });
    expect(ok.error).toBeNull();
    expect(ok.data.session).not.toBeNull();
  });
  it('usuário inexistente → 404', async () => {
    const adm = await criarUsuarioTeste('admin');
    const res = await request(app()).post('/api/usuarios/00000000-0000-4000-8000-000000000000/inativar').set(auth(adm.token));
    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('Usuário não encontrado.');
  });
});
