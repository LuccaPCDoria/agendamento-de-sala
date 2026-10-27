import { Router } from 'express';
import type { DependenciasApp } from '../dependencias';

export function criarRotas(_deps: DependenciasApp): Router {
  const router = Router();
  // As tarefas seguintes montam os routers aqui.
  return router;
}
