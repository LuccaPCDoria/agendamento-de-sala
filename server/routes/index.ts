import { Router } from 'express';
import type { DependenciasApp } from '../dependencias';
import { autenticar } from '../middlewares/autenticar';
import { me } from '../controllers/me';
import { criarRotasSalas } from './salas';

export function criarRotas(deps: DependenciasApp): Router {
  const router = Router();
  // Toda rota passa por `autenticar` (o 404 final fica fora, em app.ts).
  const auth = autenticar(deps);
  router.get('/me', auth, me);
  router.use('/salas', auth, criarRotasSalas(deps));
  // As tarefas seguintes montam os routers aqui, também atrás de `auth`.
  return router;
}
