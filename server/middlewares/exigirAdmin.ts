import type { RequestHandler } from 'express';
import { proibido } from '../lib/erros';

export const exigirAdmin: RequestHandler = (req, _res, next) => {
  next(req.usuario?.papel === 'admin' ? undefined : proibido());
};
