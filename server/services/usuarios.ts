import type { DependenciasApp } from '../dependencias';
import type { Perfil } from '../../shared/tipos';
import type { DadosCriarUsuario, DadosEditarUsuario } from '../../shared/esquemas';
import { invalido, naoEncontrado } from '../lib/erros';
import { agruparPorSolicitante } from './notificacoes';

export function criarServicoUsuarios(deps: DependenciasApp) {
  return {
    async listar(): Promise<Perfil[]> {
      return deps.repos.perfis.listar();
    },
    async criar(d: DadosCriarUsuario): Promise<Perfil> {
      const id = await deps.authAdmin.criarUsuario(d.email, d.senha);
      try {
        return await deps.transacao((r) =>
          r.perfis.inserir({ id, nome: d.nome, email: d.email, papel: d.papel }),
        );
      } catch (e) {
        try {
          await deps.authAdmin.excluirUsuario(id);
        } catch {
          /* compensação best-effort: o erro original é o que importa */
        }
        throw e;
      }
    },
    async editar(admin: Perfil, id: string, d: DadosEditarUsuario): Promise<Perfil> {
      if (id === admin.id && d.papel !== undefined && d.papel !== 'admin') {
        throw invalido('Você não pode remover o seu próprio papel de administrador.');
      }
      return deps.transacao(async (r) => {
        const perfil = await r.perfis.atualizar(id, { nome: d.nome, email: d.email, papel: d.papel });
        if (!perfil) throw naoEncontrado('Usuário não encontrado.');
        if (d.email !== undefined || d.novaSenha !== undefined) {
          await deps.authAdmin.atualizarUsuario(id, { email: d.email, senha: d.novaSenha });
        }
        return perfil;
      });
    },
    async inativar(admin: Perfil, id: string): Promise<Perfil> {
      if (admin.id === id) throw invalido('Você não pode inativar a sua própria conta.');
      const { perfil, detalhadas } = await deps.transacao(async (r) => {
        const perfil = await r.perfis.definirAtivo(id, false);
        if (!perfil) throw naoEncontrado('Usuário não encontrado.');
        const canceladas = await r.reservas.cancelarFuturasDoUsuario(id);
        await r.historico.registrar(
          canceladas.map((c) => ({ reservaId: c.id, anterior: c.anterior, novo: 'cancelada' as const, alteradoPor: admin.id })),
        );
        const detalhadas = await r.reservas.buscarDetalhadas(canceladas.map((c) => c.id));
        await deps.authAdmin.definirBloqueio(id, true);
        return { perfil, detalhadas };
      });
      await deps.notificar(agruparPorSolicitante(detalhadas, 'cancelada'));
      return perfil;
    },
    async reativar(id: string): Promise<Perfil> {
      return deps.transacao(async (r) => {
        const perfil = await r.perfis.definirAtivo(id, true);
        if (!perfil) throw naoEncontrado('Usuário não encontrado.');
        await deps.authAdmin.definirBloqueio(id, false);
        return perfil;
      });
    },
  };
}
