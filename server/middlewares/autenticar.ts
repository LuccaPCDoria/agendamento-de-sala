import type { RequestHandler } from 'express';
import type { DependenciasApp } from '../dependencias';
import { ErroApp, proibido } from '../lib/erros';

export function autenticar(deps: DependenciasApp): RequestHandler {
  return async (req, _res, next) => {
    try {
      const m = /^Bearer\s+(\S+)$/i.exec(req.header('authorization') ?? '');
      const user = m ? await deps.verificarToken(m[1]) : null;
      if (!user) throw new ErroApp(401, 'Faça login para continuar.');
      const perfil = await deps.repos.perfis.buscarPorId(user.id);
      if (!perfil || !perfil.ativo) throw proibido();
      if (user.email !== perfil.email) {
        console.warn(`E-mail do Auth difere do perfil (usuário ${perfil.id}).`);
      }
      req.usuario = perfil;
      next();
    } catch (err) {
      next(err);
    }
  };
}
