import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { criarApp } from '../../server/app';
import { depsFalsas } from './fakes';

describe('criarApp', () => {
  it('rota inexistente → 404 JSON', async () => {
    const res = await request(criarApp(depsFalsas())).get('/api/nada');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: 'Rota não encontrada.' });
  });
  it('responde no caminho /.netlify/functions/api também', async () => {
    const res = await request(criarApp(depsFalsas())).get('/.netlify/functions/api/nada');
    expect(res.body).toEqual({ erro: 'Rota não encontrada.' });
  });
});
