import express from 'express';
import type { DependenciasApp } from './dependencias';
import { criarRotas } from './routes/index';
import { tratarErros } from './middlewares/tratarErros';

export function criarApp(deps: DependenciasApp): express.Express {
  const app = express();
  app.use(express.json());
  app.use(['/api', '/.netlify/functions/api'], criarRotas(deps));
  app.use((_req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada.' });
  });
  app.use(tratarErros);
  return app;
}
