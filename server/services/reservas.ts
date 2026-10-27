import type { DependenciasApp } from '../dependencias';
import type { Perfil, ReservaDTO } from '../../shared/tipos';
import type { DadosCriarReserva } from '../../shared/esquemas';
import { validarJanelaReserva } from '../../shared/horario';
import { invalido, proibido } from '../lib/erros';
import { paraReservaDTO } from '../lib/dto';
import { agruparPorSolicitante } from './notificacoes';

export function criarServicoReservas(deps: DependenciasApp) {
  return {
    async criar(usuario: Perfil, d: DadosCriarReserva): Promise<ReservaDTO> {
      const inicio = new Date(d.inicio);
      const fim = new Date(d.fim);
      const status = usuario.papel === 'admin' ? ('aprovada' as const) : ('pendente' as const);
      const agora = deps.agora();
      const detalhada = await deps.transacao(async (r) => {
        const erro = validarJanelaReserva(inicio, fim, agora);
        if (erro) throw invalido(erro);
        if (!(await r.salas.buscarAtivaParaReserva(d.salaId))) throw invalido('Sala inexistente ou inativa.');
        if (!(await r.perfis.buscarAtivoParaReserva(usuario.id))) throw proibido();
        const reserva = await r.reservas.inserir({
          salaId: d.salaId, usuarioId: usuario.id, inicio, fim, status, finalidade: d.finalidade,
        });
        await r.historico.registrar([
          { reservaId: reserva.id, anterior: null, novo: status, alteradoPor: usuario.id },
        ]);
        const [det] = await r.reservas.buscarDetalhadas([reserva.id]);
        return det;
      });
      await deps.notificar(agruparPorSolicitante([detalhada], status === 'aprovada' ? 'confirmada' : 'criada'));
      return paraReservaDTO(detalhada, agora);
    },
  };
}
