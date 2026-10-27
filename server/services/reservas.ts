import type { DependenciasApp } from '../dependencias';
import type { Perfil, ReservaDTO } from '../../shared/tipos';
import type { DadosCriarReserva, FiltroReservas } from '../../shared/esquemas';
import { validarJanelaReserva } from '../../shared/horario';
import type { StatusFiltro, StatusReserva } from '../../shared/constantes';
import type { TipoEmail } from '../lib/notificador';
import { conflito, invalido, naoEncontrado, proibido } from '../lib/erros';
import { paraReservaDTO } from '../lib/dto';
import { agruparPorSolicitante } from './notificacoes';

const PADRAO: StatusFiltro[] = ['pendente', 'expirada', 'aprovada'];
const TODOS: StatusFiltro[] = ['pendente', 'expirada', 'aprovada', 'recusada', 'cancelada'];

export function criarServicoReservas(deps: DependenciasApp) {
  async function transicionar(
    usuario: Perfil, id: string, cfg: {
      novo: StatusReserva; permitidos: StatusReserva[]; exigirSalaAtiva: boolean; motivo?: string;
      tipo: TipoEmail; apenasDonoOuAdmin?: boolean; apenasAdmin?: boolean;
    },
  ): Promise<ReservaDTO> {
    const agora = deps.agora();
    const detalhada = await deps.transacao(async (r) => {
      const atual = await r.reservas.buscarPorIdParaAtualizar(id);
      if (!atual) throw naoEncontrado('Reserva não encontrada.');
      if (cfg.apenasAdmin && usuario.papel !== 'admin') throw proibido();
      if (cfg.apenasDonoOuAdmin && usuario.papel !== 'admin' && atual.usuarioId !== usuario.id) throw proibido();
      const nova = await r.reservas.transicionar({
        id, novo: cfg.novo, permitidos: cfg.permitidos, exigirSalaAtiva: cfg.exigirSalaAtiva,
        ...(cfg.motivo !== undefined ? { motivo: cfg.motivo } : {}),
      });
      if (!nova) throw conflito('Esta reserva não pode mais ser alterada.');
      await r.historico.registrar([
        { reservaId: id, anterior: atual.status, novo: cfg.novo, alteradoPor: usuario.id },
      ]);
      const [det] = await r.reservas.buscarDetalhadas([id]);
      return det;
    });
    await deps.notificar(agruparPorSolicitante([detalhada], cfg.tipo));
    return paraReservaDTO(detalhada, agora);
  }
  return {
    aprovar: (usuario: Perfil, id: string) =>
      transicionar(usuario, id, { novo: 'aprovada', permitidos: ['pendente'], exigirSalaAtiva: true, tipo: 'aprovada', apenasAdmin: true }),
    recusar: (usuario: Perfil, id: string, motivo: string) =>
      transicionar(usuario, id, { novo: 'recusada', permitidos: ['pendente'], exigirSalaAtiva: false, motivo, tipo: 'recusada', apenasAdmin: true }),
    cancelar: (usuario: Perfil, id: string) =>
      transicionar(usuario, id, {
        novo: 'cancelada', permitidos: ['pendente', 'aprovada'], exigirSalaAtiva: false, tipo: 'cancelada', apenasDonoOuAdmin: true,
      }),
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
