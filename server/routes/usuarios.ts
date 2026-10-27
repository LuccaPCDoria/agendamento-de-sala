import { Router } from 'express';
import type { DependenciasApp } from '../dependencias';
import { criarControladorUsuarios } from '../controllers/usuarios';

/** Todas as rotas de usuários são só para admin (aplicado em routes/index.ts). */
export function criarRotasUsuarios(deps: DependenciasApp): Router {
  const router = Router();
  const c = criarControladorUsuarios(deps);
  router.get('/', c.listar);
  router.post('/', c.criar);
  router.patch('/:id', c.editar);
  return router;
}
