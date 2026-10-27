import type { Executor } from '../lib/db';
import type { StatusReserva } from '../../shared/constantes';

export interface RepoHistorico {
  registrar(
    entradas: { reservaId: string; anterior: StatusReserva | null; novo: StatusReserva; alteradoPor: string }[],
  ): Promise<void>;
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
  };
}
