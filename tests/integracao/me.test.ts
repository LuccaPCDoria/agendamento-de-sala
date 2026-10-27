import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { criarApp } from '../../server/app';
import { criarUsuarioTeste, depsIntegracao, encerrarConexoes, limparBanco } from './ajuda';

beforeEach(limparBanco);
afterAll(async () => {
  await limparBanco();
  await encerrarConexoes();
});

describe('GET /api/me', () => {
  it('token real → 200 com o perfil', async () => {
    const { perfil, token } = await criarUsuarioTeste('admin');
    const res = await request(criarApp(depsIntegracao())).get('/api/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(perfil);
    expect(res.body.papel).toBe('admin');
  });
  it('sem token → 401', async () => {
    const res = await request(criarApp(depsIntegracao())).get('/api/me');
    expect(res.status).toBe(401);
  });
});
