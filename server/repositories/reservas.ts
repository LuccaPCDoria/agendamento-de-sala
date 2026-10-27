import type { Executor } from '../lib/db';
import type { Reserva, ReservaDetalhada } from '../tipos';
import type { StatusReserva } from '../../shared/constantes';

export interface RepoReservas {
  inserir(d: {
    salaId: string;
    usuarioId: string;
    inicio: Date;
    fim: Date;
    status: StatusReserva;
    finalidade: string;
  }): Promise<Reserva>;
  buscarDetalhadas(ids: string[]): Promise<ReservaDetalhada[]>;
}

export function criarRepoReservas(db: Executor): RepoReservas {
  return {
    async inserir(d) {
      const [r] = await db<Reserva[]>`
        insert into reservas (sala_id, usuario_id, inicio, fim, status, finalidade)
        values (${d.salaId}, ${d.usuarioId}, ${d.inicio}, ${d.fim}, ${d.status}, ${d.finalidade})
        returning id, sala_id, usuario_id, inicio, fim, status, finalidade, motivo_recusa, criado_em, atualizado_em`;
      return r;
    },
    async buscarDetalhadas(ids) {
      if (ids.length === 0) return [];
      return db<ReservaDetalhada[]>`
        select r.id, r.sala_id, r.usuario_id, r.inicio, r.fim, r.status, r.finalidade, r.motivo_recusa,
               r.criado_em, r.atualizado_em,
               s.nome as sala_nome, s.tipo as sala_tipo,
               p.nome as solicitante_nome, p.email as solicitante_email
        from reservas r
        join salas s on s.id = r.sala_id
        join perfis p on p.id = r.usuario_id
        where r.id in ${db(ids)}
        order by r.inicio`;
    },
  };
}
