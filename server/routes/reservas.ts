import { Router } from 'express';
import type { DependenciasApp } from '../dependencias';
import { exigirAdmin } from '../middlewares/exigirAdmin';
import { criarControladorReservas } from '../controllers/reservas';

export function criarRotasReservas(deps: DependenciasApp): Router {
  const router = Router();
  const c = criarControladorReservas(deps);
  router.get('/pendentes', exigirAdmin, c.listarPendentes); // antes de qualquer rota /:id
  router.get('/', c.listar);
  router.post('/', c.criar);
  return router;
}
