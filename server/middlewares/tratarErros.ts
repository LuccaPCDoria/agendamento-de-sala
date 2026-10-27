import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ErroApp } from '../lib/erros';

export function tratarErros(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ErroApp) {
    res.status(err.status).json({ erro: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ erro: err.issues[0]?.message ?? 'Dados inválidos.' });
    return;
  }
  const { code, constraint_name } = (err ?? {}) as { code?: string; constraint_name?: string };
  if (code === '23P01') {
    res.status(409).json({ erro: 'Esta sala já está reservada nesse horário.' });
    return;
  }
  if (code === '23505' && constraint_name === 'perfis_email_unico') {
    res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
    return;
  }
  if (code === '23505' && constraint_name === 'salas_nome_unico') {
    res.status(409).json({ erro: 'Já existe uma sala com este nome.' });
    return;
  }
  if (code === '40P01') {
    res.status(409).json({ erro: 'Operação concorrente detectada. Tente novamente.' });
    return;
  }
  console.error(err);
  res.status(500).json({ erro: 'Erro interno. Tente novamente.' });
}
