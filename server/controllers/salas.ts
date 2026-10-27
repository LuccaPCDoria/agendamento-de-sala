import type { RequestHandler } from 'express';
import type { DependenciasApp } from '../dependencias';
import { criarServicoSalas } from '../services/salas';
import { esquemaEditarSala, esquemaSala, esquemaUuid } from '../../shared/esquemas';
import { invalido, naoEncontrado } from '../lib/erros';

export function criarControladorSalas(deps: DependenciasApp) {
  const servico = criarServicoSalas(deps);
  const listar: RequestHandler = async (req, res, next) => {
    try {
      res.json(await servico.listar(req.usuario!, req.query.incluirInativas === 'true'));
    } catch (e) { next(e); }
  };
  const criar: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json(await servico.criar(esquemaSala.parse(req.body)));
    } catch (e) { next(e); }
  };
  const editar: RequestHandler = async (req, res, next) => {
    try {
      const id = esquemaUuid.safeParse(req.params.id);
      if (!id.success) throw naoEncontrado('Sala não encontrada.');
      const dados = esquemaEditarSala.parse(req.body ?? {});
      if (Object.values(dados).every((v) => v === undefined)) throw invalido('Nenhum campo para atualizar.');
      res.json(await servico.editar(id.data, dados));
    } catch (e) { next(e); }
  };
  const mudarAtiva = (acao: 'inativar' | 'reativar'): RequestHandler => async (req, res, next) => {
    try {
      const id = esquemaUuid.safeParse(req.params.id);
      if (!id.success) throw naoEncontrado('Sala não encontrada.');
      res.json(acao === 'inativar' ? await servico.inativar(req.usuario!, id.data) : await servico.reativar(id.data));
    } catch (e) { next(e); }
  };
  return { listar, criar, editar, inativar: mudarAtiva('inativar'), reativar: mudarAtiva('reativar') };
}
