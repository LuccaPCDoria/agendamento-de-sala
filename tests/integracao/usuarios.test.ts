import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { criarApp } from '../../server/app';
import { criarUsuarioTeste, depsIntegracao, encerrarConexoes, limparBanco } from './ajuda';

beforeEach(limparBanco);
afterAll(async () => {
  await limparBanco();
  await encerrarConexoes();
});

const app = () => criarApp(depsIntegracao());
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const novo = () => ({ nome: 'Prof Teste', email: `${randomUUID()}@teste.local`, senha: 'senha-segura-123', papel: 'usuario' });
const clienteAnon = () =>
  createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

describe('API de usuários', () => {
  it('admin cria professor e o professor consegue logar', async () => {
    const { token } = await criarUsuarioTeste('admin');
    const dados = novo();
    const res = await request(app()).post('/api/usuarios').set(auth(token)).send(dados);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nome: dados.nome, email: dados.email, papel: 'usuario', ativo: true });
    expect(JSON.stringify(res.body)).not.toContain(dados.senha);
    const { data, error } = await clienteAnon().auth.signInWithPassword({ email: dados.email, password: dados.senha });
    expect(error).toBeNull();
    expect(data.session).not.toBeNull();
  });
  it('e-mail já existente → 409', async () => {
    const { token } = await criarUsuarioTeste('admin');
    const dados = novo();
    await request(app()).post('/api/usuarios').set(auth(token)).send(dados);
    const res = await request(app()).post('/api/usuarios').set(auth(token)).send({ ...dados, email: dados.email.toUpperCase() });
    expect(res.status).toBe(409);
    expect(res.body.erro).toBe('Já existe um usuário com este e-mail.');
  });
  it('professor não acessa a API de usuários → 403', async () => {
    const { token } = await criarUsuarioTeste('usuario');
    expect((await request(app()).get('/api/usuarios').set(auth(token))).status).toBe(403);
    expect((await request(app()).post('/api/usuarios').set(auth(token)).send(novo())).status).toBe(403);
  });
  it('lista usuários (admin)', async () => {
    const { token, perfil } = await criarUsuarioTeste('admin');
    const res = await request(app()).get('/api/usuarios').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.map((p: { id: string }) => p.id)).toContain(perfil.id);
  });
  it('edita nome e papel; id inválido → 404; corpo vazio → 400', async () => {
    const { token } = await criarUsuarioTeste('admin');
    const alvo = await criarUsuarioTeste('usuario');
    const ok = await request(app()).patch(`/api/usuarios/${alvo.perfil.id}`).set(auth(token)).send({ nome: 'Outro', papel: 'admin' });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ nome: 'Outro', papel: 'admin' });
    expect((await request(app()).patch('/api/usuarios/xxx').set(auth(token)).send({ nome: 'A' })).status).toBe(404);
    const vazio = await request(app()).patch(`/api/usuarios/${alvo.perfil.id}`).set(auth(token)).send({});
    expect(vazio.status).toBe(400);
    expect(vazio.body.erro).toBe('Nenhum campo para atualizar.');
  });
  it('editar e-mail para um já usado → 409 e nada muda', async () => {
    const { token } = await criarUsuarioTeste('admin');
    const a = await criarUsuarioTeste('usuario');
    const b = await criarUsuarioTeste('usuario');
    const res = await request(app()).patch(`/api/usuarios/${a.perfil.id}`).set(auth(token)).send({ email: b.perfil.email });
    expect(res.status).toBe(409);
    const lista = await request(app()).get('/api/usuarios').set(auth(token));
    expect(lista.body.find((p: { id: string }) => p.id === a.perfil.id).email).toBe(a.perfil.email);
  });
  it('admin não remove o próprio papel → 400', async () => {
    const { token, perfil } = await criarUsuarioTeste('admin');
    const res = await request(app()).patch(`/api/usuarios/${perfil.id}`).set(auth(token)).send({ papel: 'usuario' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Você não pode remover o seu próprio papel de administrador.');
  });
  it('troca de senha: o usuário loga com a nova', async () => {
    const { token } = await criarUsuarioTeste('admin');
    const dados = novo();
    const c = await request(app()).post('/api/usuarios').set(auth(token)).send(dados);
    const res = await request(app()).patch(`/api/usuarios/${c.body.id}`).set(auth(token)).send({ novaSenha: 'nova-senha-456' });
    expect(res.status).toBe(200);
    const { error } = await clienteAnon().auth.signInWithPassword({ email: dados.email, password: 'nova-senha-456' });
    expect(error).toBeNull();
  });
});
