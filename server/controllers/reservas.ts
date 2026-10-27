import type { RequestHandler } from 'express';
import type { DependenciasApp } from '../dependencias';
import { criarServicoReservas } from '../services/reservas';
import { esquemaCriarReserva } from '../../shared/esquemas';

export function criarControladorReservas(deps: DependenciasApp) {
  const servico = criarServicoReservas(deps);
  const criar: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json(await servico.criar(req.usuario!, esquemaCriarReserva.parse(req.body)));
    } catch (e) { next(e); }
  };
  return { criar };
}
