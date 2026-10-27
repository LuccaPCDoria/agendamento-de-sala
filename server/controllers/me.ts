import type { RequestHandler } from 'express';

export const me: RequestHandler = (req, res) => {
  res.json(req.usuario);
};
