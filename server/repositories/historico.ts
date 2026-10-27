import type { Executor } from '../lib/db';
import type { StatusReserva } from '../../shared/constantes';
import type { EntradaHistoricoDTO } from '../../shared/tipos';

export interface RepoHistorico {
  registrar(
    entradas: { reservaId: string; anterior: StatusReserva | null; novo: StatusReserva; alteradoPor: string }[],
  ): Promise<void>;
  listarDaReserva(reservaId: string): Promise<EntradaHistoricoDTO[]>;
}

export function criarRepoHistorico(db: Executor): RepoHistorico {
  return {
    async registrar(entradas) {
      if (entradas.length === 0) return;
      await db`
        insert into historico_reservas ${db(
          entradas.map((e) => ({
            reserva_id: e.reservaId, status_anterior: e.anterior, status_novo: e.novo, alterado_por: e.alteradoPor,
          })),
        )}`;
    },
    async listarDaReserva(reservaId) {
      const linhas = await db<
        { statusAnterior: StatusReserva | null; statusNovo: StatusReserva; alteradoPorNome: string; alteradoEm: Date }[]
      >`
        select h.status_anterior, h.status_novo, p.nome as alterado_por_nome, h.alterado_em
        from historico_reservas h
        join perfis p on p.id = h.alterado_por
        where h.reserva_id = ${reservaId}
        order by h.id`;
      return linhas.map((l) => ({
        statusAnterior: l.statusAnterior, statusNovo: l.statusNovo,
        alteradoPorNome: l.alteradoPorNome, alteradoEm: l.alteradoEm.toISOString(),
      }));
    },
  };
}
