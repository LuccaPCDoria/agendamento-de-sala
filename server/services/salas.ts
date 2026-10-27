import type { DependenciasApp } from '../dependencias';
import type { Perfil, Sala } from '../../shared/tipos';
import type { DadosSala } from '../../shared/esquemas';
import { naoEncontrado } from '../lib/erros';
import { agruparPorSolicitante } from './notificacoes';

export function criarServicoSalas(deps: DependenciasApp) {
  return {
    async listar(usuario: Perfil, incluirInativas: boolean): Promise<Sala[]> {
      return deps.repos.salas.listar(usuario.papel === 'admin' && incluirInativas);
    },
    async criar(d: DadosSala): Promise<Sala> {
      return deps.repos.salas.inserir(d);
    },
    async editar(id: string, d: Partial<DadosSala>): Promise<Sala> {
      const sala = await deps.repos.salas.atualizar(id, d);
      if (!sala) throw naoEncontrado('Sala não encontrada.');
      return sala;
    },
    async inativar(admin: Perfil, id: string): Promise<Sala> {
      const { sala, detalhadas } = await deps.transacao(async (r) => {
        const sala = await r.salas.definirAtiva(id, false);
        if (!sala) throw naoEncontrado('Sala não encontrada.');
        const canceladas = await r.reservas.cancelarFuturasDaSala(id);
        await r.historico.registrar(
          canceladas.map((c) => ({ reservaId: c.id, anterior: c.anterior, novo: 'cancelada' as const, alteradoPor: admin.id })),
        );
        const detalhadas = await r.reservas.buscarDetalhadas(canceladas.map((c) => c.id));
        return { sala, detalhadas };
      });
      await deps.notificar(agruparPorSolicitante(detalhadas, 'cancelada'));
      return sala;
    },
    async reativar(id: string): Promise<Sala> {
      const sala = await deps.repos.salas.definirAtiva(id, true);
      if (!sala) throw naoEncontrado('Sala não encontrada.');
      return sala;
    },
  };
}
