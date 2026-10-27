import { Router } from 'express';
import type { DependenciasApp } from '../dependencias';
import { criarControladorReservas } from '../controllers/reservas';

export function criarRotasReservas(deps: DependenciasApp): Router {
  const router = Router();
  const c = criarControladorReservas(deps);
  router.post('/', c.criar);
  return router;
}
