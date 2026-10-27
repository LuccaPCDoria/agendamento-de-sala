import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { criarApp } from '../../server/app';
import { criarSalaTeste, criarUsuarioTeste, depsIntegracao, encerrarConexoes, limparBanco, sqlTeste } from './ajuda';

beforeEach(limparBanco);
afterAll(async () => {
  await limparBanco();
  await encerrarConexoes();
});

const app = () => criarApp(depsIntegracao());
const nova = { nome: 'Lab 1', tipo: 'laboratorio', capacidade: 20, recursos: ['pcs'] };
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('API de salas', () => {
  it('admin cria sala → 201', async () => {
    const { token } = await criarUsuarioTeste('admin');
    const res = await request(app()).post('/api/salas').set(auth(token)).send(nova);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ...nova, ativa: true });
  });
  it('nome duplicado com outra caixa → 409', async () => {
    const { token } = await criarUsuarioTeste('admin');
    await request(app()).post('/api/salas').set(auth(token)).send(nova);
    const res = await request(app()).post('/api/salas').set(auth(token)).send({ ...nova, nome: 'LAB 1' });
    expect(res.status).toBe(409);
    expect(res.body.erro).toBe('Já existe uma sala com este nome.');
  });
  it('professor tenta criar → 403', async () => {
    const { token } = await criarUsuarioTeste('usuario');
    const res = await request(app()).post('/api/salas').set(auth(token)).send(nova);
    expect(res.status).toBe(403);
  });
  it('capacidade 0 → 400', async () => {
    const { token } = await criarUsuarioTeste('admin');
    const res = await request(app()).post('/api/salas').set(auth(token)).send({ ...nova, capacidade: 0 });
    expect(res.status).toBe(400);
  });
  it('lista ordenada por nome; incluirInativas só para admin', async () => {
    const adm = await criarUsuarioTeste('admin');
    const prof = await criarUsuarioTeste('usuario');
    await criarSalaTeste('B sala');
    const a = await criarSalaTeste('a sala');
    await sqlTeste`update salas set ativa = false where id = ${a.id}`;
    const p = await request(app()).get('/api/salas?incluirInativas=true').set(auth(prof.token));
    expect(p.body.map((s: { nome: string }) => s.nome)).toEqual(['B sala']);
    const d = await request(app()).get('/api/salas?incluirInativas=true').set(auth(adm.token));
    expect(d.body.map((s: { nome: string }) => s.nome)).toEqual(['a sala', 'B sala']);
  });
  it('PATCH edita, valida id e corpo vazio', async () => {
    const { token } = await criarUsuarioTeste('admin');
    const s = await criarSalaTeste();
    const ok = await request(app()).patch(`/api/salas/${s.id}`).set(auth(token)).send({ capacidade: 5 });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ id: s.id, capacidade: 5, tipo: 'reuniao' });
    const vazio = await request(app()).patch(`/api/salas/${s.id}`).set(auth(token)).send({});
    expect(vazio.status).toBe(400);
    expect(vazio.body.erro).toBe('Nenhum campo para atualizar.');
    const ruim = await request(app()).patch('/api/salas/abc').set(auth(token)).send({ capacidade: 5 });
    expect(ruim.status).toBe(404);
    const nao = await request(app()).patch('/api/salas/11111111-1111-4111-8111-111111111111').set(auth(token)).send({ capacidade: 5 });
    expect(nao.status).toBe(404);
  });
});
