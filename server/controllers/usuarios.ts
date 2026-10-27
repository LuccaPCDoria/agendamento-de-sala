import type { RequestHandler } from 'express';
import type { DependenciasApp } from '../dependencias';
import { criarServicoUsuarios } from '../services/usuarios';
import { esquemaCriarUsuario, esquemaEditarUsuario, esquemaUuid } from '../../shared/esquemas';
import { invalido, naoEncontrado } from '../lib/erros';

export function criarControladorUsuarios(deps: DependenciasApp) {
  const servico = criarServicoUsuarios(deps);
  const listar: RequestHandler = async (_req, res, next) => {
    try {
      res.json(await servico.listar());
    } catch (e) { next(e); }
  };
  const criar: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json(await servico.criar(esquemaCriarUsuario.parse(req.body)));
    } catch (e) { next(e); }
  };
  const editar: RequestHandler = async (req, res, next) => {
    try {
      const id = esquemaUuid.safeParse(req.params.id);
      if (!id.success) throw naoEncontrado('Usuário não encontrado.');
      const dados = esquemaEditarUsuario.parse(req.body ?? {});
      if (Object.values(dados).every((v) => v === undefined)) throw invalido('Nenhum campo para atualizar.');
      res.json(await servico.editar(req.usuario!, id.data, dados));
    } catch (e) { next(e); }
  };
  const mudarAtivo = (acao: 'inativar' | 'reativar'): RequestHandler => async (req, res, next) => {
    try {
      const id = esquemaUuid.safeParse(req.params.id);
      if (!id.success) throw naoEncontrado('Usuário não encontrado.');
      res.json(acao === 'inativar' ? await servico.inativar(req.usuario!, id.data) : await servico.reativar(id.data));
    } catch (e) { next(e); }
  };
  return { listar, criar, editar, inativar: mudarAtivo('inativar'), reativar: mudarAtivo('reativar') };
}
