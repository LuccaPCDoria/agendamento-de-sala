import { Router } from 'express';
import type { DependenciasApp } from '../dependencias';
import { exigirAdmin } from '../middlewares/exigirAdmin';
import { criarControladorSalas } from '../controllers/salas';

export function criarRotasSalas(deps: DependenciasApp): Router {
  const router = Router();
  const c = criarControladorSalas(deps);
  router.get('/', c.listar);
  router.post('/', exigirAdmin, c.criar);
  router.patch('/:id', exigirAdmin, c.editar);
  return router;
}
