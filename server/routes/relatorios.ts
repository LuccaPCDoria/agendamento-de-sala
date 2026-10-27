import { Router } from 'express';
import type { DependenciasApp } from '../dependencias';
import { criarControladorRelatorios } from '../controllers/relatorios';

export function criarRotasRelatorios(deps: DependenciasApp): Router {
  const router = Router();
  router.get('/mensal', criarControladorRelatorios(deps).mensal);
  return router;
}
