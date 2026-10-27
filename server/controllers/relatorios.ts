import type { RequestHandler } from 'express';
import type { DependenciasApp } from '../dependencias';
import { criarServicoRelatorios } from '../services/relatorios';
import { esquemaMes } from '../../shared/esquemas';
import { invalido } from '../lib/erros';

export function criarControladorRelatorios(deps: DependenciasApp) {
  const servico = criarServicoRelatorios(deps);
  const mensal: RequestHandler = async (req, res, next) => {
    try {
      const r = esquemaMes.safeParse(req.query.mes);
      if (!r.success) throw invalido('Mês inválido.');
      res.json(await servico.mensal(r.data));
    } catch (e) { next(e); }
  };
  return { mensal };
}
