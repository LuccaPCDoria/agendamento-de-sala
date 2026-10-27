import { Router } from 'express';
import type { DependenciasApp } from '../dependencias';
import { autenticar } from '../middlewares/autenticar';
import { me } from '../controllers/me';
import { criarRotasSalas } from './salas';
import { criarRotasUsuarios } from './usuarios';
import { exigirAdmin } from '../middlewares/exigirAdmin';
import { criarRotasReservas } from './reservas';
import { criarRotasRelatorios } from './relatorios';

export function criarRotas(deps: DependenciasApp): Router {
  const router = Router();
  // Toda rota passa por `autenticar` (o 404 final fica fora, em app.ts).
  const auth = autenticar(deps);
  router.get('/me', auth, me);
  router.use('/salas', auth, criarRotasSalas(deps));
  router.use('/usuarios', auth, exigirAdmin, criarRotasUsuarios(deps));
  router.use('/reservas', auth, criarRotasReservas(deps));
  router.use('/relatorios', auth, exigirAdmin, criarRotasRelatorios(deps));
  // As tarefas seguintes montam os routers aqui, também atrás de `auth`.
  return router;
}
