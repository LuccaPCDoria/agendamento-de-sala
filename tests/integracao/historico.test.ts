import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { criarApp } from '../../server/app';
import { criarSalaTeste, criarUsuarioTeste, depsIntegracao, encerrarConexoes, limparBanco } from './ajuda';

beforeEach(limparBanco);
afterAll(async () => {
  await limparBanco();
  await encerrarConexoes();
});

const app = () => criarApp(depsIntegracao());
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

function proximaSegunda(): Date {
  const d = new Date(Date.now() + 7 * 86400000);
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(15, 0, 0, 0);
  return d;
}

describe('GET /api/reservas/:id/historico', () => {
  it('criar → aprovar → cancelar gera 3 entradas em ordem com os nomes; alheio → 403; id inválido → 404', async () => {
    const adm = await criarUsuarioTeste('admin');
    const prof = await criarUsuarioTeste('usuario');
    const outro = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const inicio = proximaSegunda();
    const fim = new Date(inicio.getTime() + 3600000);
    const c = await request(app()).post('/api/reservas').set(auth(prof.token))
      .send({ salaId: sala.id, inicio: inicio.toISOString(), fim: fim.toISOString(), finalidade: 'Aula' });
    expect(c.status).toBe(201);
    const id = c.body.id as string;
    expect((await request(app()).post(`/api/reservas/${id}/aprovar`).set(auth(adm.token))).status).toBe(200);
    expect((await request(app()).post(`/api/reservas/${id}/cancelar`).set(auth(prof.token))).status).toBe(200);

    const h = await request(app()).get(`/api/reservas/${id}/historico`).set(auth(prof.token));
    expect(h.status).toBe(200);
    expect(h.body.map((e: { statusAnterior: string | null; statusNovo: string; alteradoPorNome: string }) =>
      [e.statusAnterior, e.statusNovo, e.alteradoPorNome])).toEqual([
      [null, 'pendente', prof.perfil.nome],
      ['pendente', 'aprovada', adm.perfil.nome],
      ['aprovada', 'cancelada', prof.perfil.nome],
    ]);
    expect(typeof h.body[0].alteradoEm).toBe('string');

    expect((await request(app()).get(`/api/reservas/${id}/historico`).set(auth(adm.token))).status).toBe(200);
    expect((await request(app()).get(`/api/reservas/${id}/historico`).set(auth(outro.token))).status).toBe(403);
    expect((await request(app()).get('/api/reservas/xyz/historico').set(auth(prof.token))).status).toBe(404);
    expect((await request(app()).get('/api/reservas/22222222-2222-4222-8222-222222222222/historico').set(auth(prof.token))).status).toBe(404);
  });
});
