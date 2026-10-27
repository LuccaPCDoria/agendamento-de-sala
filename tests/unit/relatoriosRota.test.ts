import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { criarApp } from '../../server/app';
import { depsFalsas } from './fakes';

describe('GET /api/relatorios/mensal', () => {
  it('mes inválido → 400 "Mês inválido."', async () => {
    const deps = depsFalsas({ verificarToken: vi.fn().mockResolvedValue({ id: 'a', email: 'a@x.com' }) });
    vi.mocked(deps.repos.perfis.buscarPorId).mockResolvedValue({ id: 'a', nome: 'A', email: 'a@x.com', papel: 'admin', ativo: true });
    const res = await request(criarApp(deps)).get('/api/relatorios/mensal?mes=2026-13').set('Authorization', 'Bearer t');
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Mês inválido.');
  });
  it('professor → 403', async () => {
    const deps = depsFalsas({ verificarToken: vi.fn().mockResolvedValue({ id: 'a', email: 'a@x.com' }) });
    vi.mocked(deps.repos.perfis.buscarPorId).mockResolvedValue({ id: 'a', nome: 'A', email: 'a@x.com', papel: 'usuario', ativo: true });
    const res = await request(criarApp(deps)).get('/api/relatorios/mensal?mes=2026-11').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
  });
});
