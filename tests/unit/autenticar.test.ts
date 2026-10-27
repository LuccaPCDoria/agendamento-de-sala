import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { criarApp } from '../../server/app';
import { autenticar } from '../../server/middlewares/autenticar';
import { exigirAdmin } from '../../server/middlewares/exigirAdmin';
import { tratarErros } from '../../server/middlewares/tratarErros';
import { depsFalsas } from './fakes';
import type { Perfil } from '../../shared/tipos';

const perfilAtivo: Perfil = { id: 'u1', nome: 'Ana', email: 'ana@x.com', papel: 'usuario', ativo: true };

function montar(perfil: Perfil | null, user: { id: string; email: string } | null = { id: 'u1', email: 'ana@x.com' }) {
  const deps = depsFalsas({ verificarToken: vi.fn().mockResolvedValue(user) });
  vi.mocked(deps.repos.perfis.buscarPorId).mockResolvedValue(perfil);
  return { deps, app: criarApp(deps) };
}

describe('autenticar + /api/me', () => {
  it('sem token → 401', async () => {
    const { app } = montar(perfilAtivo);
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ erro: 'Faça login para continuar.' });
  });
  it('token inválido → 401', async () => {
    const { app } = montar(perfilAtivo, null);
    const res = await request(app).get('/api/me').set('Authorization', 'Bearer ruim');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ erro: 'Faça login para continuar.' });
  });
  it('perfil inativo → 403', async () => {
    const { app } = montar({ ...perfilAtivo, ativo: false });
    const res = await request(app).get('/api/me').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
  });
  it('perfil inexistente → 403', async () => {
    const { app } = montar(null);
    const res = await request(app).get('/api/me').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
  });
  it('ok → 200 com o perfil', async () => {
    const { app, deps } = montar(perfilAtivo);
    const res = await request(app).get('/api/me').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(perfilAtivo);
    expect(deps.verificarToken).toHaveBeenCalledWith('t');
  });
  it('e-mail divergente → avisa e segue', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { app } = montar(perfilAtivo, { id: 'u1', email: 'outro@x.com' });
    const res = await request(app).get('/api/me').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });
  it('rota inexistente continua 404 sem token', async () => {
    const { app } = montar(perfilAtivo);
    expect((await request(app).get('/api/nada')).status).toBe(404);
  });
});

describe('exigirAdmin', () => {
  const montarAdmin = (papel: Perfil['papel']) => {
    const deps = depsFalsas({ verificarToken: vi.fn().mockResolvedValue({ id: 'u1', email: 'ana@x.com' }) });
    vi.mocked(deps.repos.perfis.buscarPorId).mockResolvedValue({ ...perfilAtivo, papel });
    const app = express();
    app.get('/admin', autenticar(deps), exigirAdmin, (_req, res) => res.json({ ok: true }));
    app.use(tratarErros);
    return app;
  };
  it('professor → 403', async () => {
    const res = await request(montarAdmin('usuario')).get('/admin').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
  });
  it('admin → 200', async () => {
    const res = await request(montarAdmin('admin')).get('/admin').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
  });
});
