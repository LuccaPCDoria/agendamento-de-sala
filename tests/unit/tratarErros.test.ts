import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ZodError, z } from 'zod';
import { ErroApp } from '../../server/lib/erros';
import { tratarErros } from '../../server/middlewares/tratarErros';

function appQueLanca(erro: unknown) {
  const app = express();
  app.get('/x', () => {
    throw erro;
  });
  app.use(tratarErros);
  return app;
}

afterEach(() => vi.restoreAllMocks());

describe('tratarErros', () => {
  it.each([
    [new ErroApp(404, 'Reserva não encontrada.'), 404, 'Reserva não encontrada.'],
    [{ code: '23P01' }, 409, 'Esta sala já está reservada nesse horário.'],
    [{ code: '23505', constraint_name: 'perfis_email_unico' }, 409, 'Já existe um usuário com este e-mail.'],
    [{ code: '23505', constraint_name: 'salas_nome_unico' }, 409, 'Já existe uma sala com este nome.'],
    [{ code: '40P01' }, 409, 'Operação concorrente detectada. Tente novamente.'],
    [new Error('boom'), 500, 'Erro interno. Tente novamente.'],
  ])('mapeia %o', async (erro, status, msg) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(appQueLanca(erro)).get('/x');
    expect(res.status).toBe(status);
    expect(res.body).toEqual({ erro: msg });
  });

  it('ZodError vira 400 com a primeira mensagem', async () => {
    const r = z.object({ a: z.string({ required_error: 'Campo a obrigatório.' }) }).safeParse({});
    const erro = (r as { error: ZodError }).error;
    const res = await request(appQueLanca(erro)).get('/x');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: 'Campo a obrigatório.' });
  });
});
