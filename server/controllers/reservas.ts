import type { RequestHandler } from 'express';
import type { DependenciasApp } from '../dependencias';
import { criarServicoReservas } from '../services/reservas';
import { esquemaCriarReserva, esquemaListarReservas } from '../../shared/esquemas';

export function criarControladorReservas(deps: DependenciasApp) {
  const servico = criarServicoReservas(deps);
  const criar: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json(await servico.criar(req.usuario!, esquemaCriarReserva.parse(req.body)));
    } catch (e) { next(e); }
  };
  const listar: RequestHandler = async (req, res, next) => {
    try {
      res.json(await servico.listar(req.usuario!, esquemaListarReservas.parse(req.query)));
    } catch (e) { next(e); }
  };
  const listarPendentes: RequestHandler = async (_req, res, next) => {
    try {
      res.json(await servico.listarPendentes());
    } catch (e) { next(e); }
  };
  return { criar, listar, listarPendentes };
}
