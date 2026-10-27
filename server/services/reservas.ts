import type { DependenciasApp } from '../dependencias';
import type { Perfil, ReservaDTO } from '../../shared/tipos';
import type { DadosCriarReserva, FiltroReservas } from '../../shared/esquemas';
import type { StatusFiltro } from '../../shared/constantes';
import { validarJanelaReserva } from '../../shared/horario';
import { invalido, proibido } from '../lib/erros';
import { paraReservaDTO } from '../lib/dto';
import { agruparPorSolicitante } from './notificacoes';

const PADRAO: StatusFiltro[] = ['pendente', 'expirada', 'aprovada'];
const TODOS: StatusFiltro[] = ['pendente', 'expirada', 'aprovada', 'recusada', 'cancelada'];

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
    async listar(usuario: Perfil, f: FiltroReservas): Promise<ReservaDTO[]> {
      let status: StatusFiltro[];
      if (f.minhas) {
        status = f.status ?? TODOS;
      } else if (usuario.papel === 'admin') {
        status = f.status ?? PADRAO;
      } else {
        if (f.status?.some((st) => !PADRAO.includes(st))) throw invalido('Filtro de status não permitido.');
        status = f.status ?? PADRAO;
      }
      const agora = deps.agora();
      const lista = await deps.repos.reservas.listar({
        inicio: new Date(f.inicio), fim: new Date(f.fim), salaId: f.salaId, tipo: f.tipo,
        status, usuarioId: f.minhas ? usuario.id : undefined, agora,
      });
      return lista.map((r) => paraReservaDTO(r, agora));
    },
    async listarPendentes(): Promise<ReservaDTO[]> {
      const agora = deps.agora();
      return (await deps.repos.reservas.listarPendentesFuturas(agora)).map((r) => paraReservaDTO(r, agora));
    },
  };
}
