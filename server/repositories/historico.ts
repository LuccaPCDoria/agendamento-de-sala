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
      for (const e of entradas) {
        await db`
          insert into historico_reservas (reserva_id, status_anterior, status_novo, alterado_por)
          values (${e.reservaId}, ${e.anterior}, ${e.novo}, ${e.alteradoPor})`;
      }
    },
  };
}
