import type { RequestHandler } from 'express';
import type { DependenciasApp } from '../dependencias';
import { criarServicoReservas } from '../services/reservas';
import { naoEncontrado } from '../lib/erros';
import { esquemaCriarReserva, esquemaListarReservas, esquemaRecusar, esquemaUuid } from '../../shared/esquemas';

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
  const idValido = (valor: unknown): string => {
    const r = esquemaUuid.safeParse(valor);
    if (!r.success) throw naoEncontrado('Reserva não encontrada.');
    return r.data;
  };
  const aprovar: RequestHandler = async (req, res, next) => {
    try {
      res.json(await servico.aprovar(req.usuario!, idValido(req.params.id)));
    } catch (e) { next(e); }
  };
  const recusar: RequestHandler = async (req, res, next) => {
    try {
      const id = idValido(req.params.id);
      res.json(await servico.recusar(req.usuario!, id, esquemaRecusar.parse(req.body).motivo));
    } catch (e) { next(e); }
  };
  const cancelar: RequestHandler = async (req, res, next) => {
    try {
      res.json(await servico.cancelar(req.usuario!, idValido(req.params.id)));
    } catch (e) { next(e); }
  };
  return { criar, listar, listarPendentes, aprovar, recusar, cancelar };
}
