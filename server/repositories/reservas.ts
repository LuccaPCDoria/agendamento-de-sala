import type { Executor } from '../lib/db';
import type { Reserva, ReservaDetalhada } from '../tipos';
import type { StatusFiltro, StatusReserva, TipoSala } from '../../shared/constantes';

export interface RepoReservas {
  inserir(d: {
    salaId: string;
    usuarioId: string;
    inicio: Date;
    fim: Date;
    status: StatusReserva;
    finalidade: string;
  }): Promise<Reserva>;
  buscarPorId(id: string): Promise<Reserva | null>;
  /** Dentro de transação: trava a linha (for update) para que o status lido seja o real. */
  buscarPorIdParaAtualizar(id: string): Promise<Reserva | null>;
  transicionar(p: {
    id: string;
    novo: StatusReserva;
    permitidos: StatusReserva[];
    motivo?: string;
    exigirSalaAtiva: boolean;
  }): Promise<Reserva | null>;
  buscarDetalhadas(ids: string[]): Promise<ReservaDetalhada[]>;
  listar(f: {
    inicio: Date;
    fim: Date;
    salaId?: string;
    tipo?: TipoSala;
    status: StatusFiltro[];
    usuarioId?: string;
    agora: Date;
  }): Promise<ReservaDetalhada[]>;
  listarPendentesFuturas(agora: Date): Promise<ReservaDetalhada[]>;
}

export function criarRepoReservas(db: Executor): RepoReservas {
  const selecionar = () => db`
    select r.id, r.sala_id, r.usuario_id, r.inicio, r.fim, r.status, r.finalidade, r.motivo_recusa,
           r.criado_em, r.atualizado_em,
           s.nome as sala_nome, s.tipo as sala_tipo,
           p.nome as solicitante_nome, p.email as solicitante_email
    from reservas r
    join salas s on s.id = r.sala_id
    join perfis p on p.id = r.usuario_id`;
  return {
    async inserir(d) {
      const [r] = await db<Reserva[]>`
        insert into reservas (sala_id, usuario_id, inicio, fim, status, finalidade)
        values (${d.salaId}, ${d.usuarioId}, ${d.inicio}, ${d.fim}, ${d.status}, ${d.finalidade})
        returning id, sala_id, usuario_id, inicio, fim, status, finalidade, motivo_recusa, criado_em, atualizado_em`;
      return r;
    },
    async buscarPorId(id) {
      const [r] = await db<Reserva[]>`
        select id, sala_id, usuario_id, inicio, fim, status, finalidade, motivo_recusa, criado_em, atualizado_em
        from reservas where id = ${id}`;
      return r ?? null;
    },
    async buscarPorIdParaAtualizar(id) {
      const [r] = await db<Reserva[]>`
        select id, sala_id, usuario_id, inicio, fim, status, finalidade, motivo_recusa, criado_em, atualizado_em
        from reservas where id = ${id} for update`;
      return r ?? null;
    },
    async transicionar(p) {
      const [r] = await db<Reserva[]>`
        update reservas set status = ${p.novo}, motivo_recusa = ${p.motivo ?? null}, atualizado_em = now()
        where id = ${p.id}
          and status in ${db(p.permitidos)}
          and inicio > now()
          ${p.exigirSalaAtiva ? db`and exists (select 1 from salas s where s.id = reservas.sala_id and s.ativa)` : db``}
        returning id, sala_id, usuario_id, inicio, fim, status, finalidade, motivo_recusa, criado_em, atualizado_em`;
      return r ?? null;
    },
    async buscarDetalhadas(ids) {
      if (ids.length === 0) return [];
      return db<ReservaDetalhada[]>`
        ${selecionar()}
        where r.id in ${db(ids)}
        order by r.inicio`;
    },
    async listar(f) {
      const condicaoStatus = (st: StatusFiltro) =>
        st === 'pendente'
          ? db`(r.status = 'pendente' and r.inicio > ${f.agora})`
          : st === 'expirada'
            ? db`(r.status = 'pendente' and r.inicio <= ${f.agora})`
            : db`r.status = ${st}`;
      const statusSql = f.status.reduce<ReturnType<typeof condicaoStatus> | null>(
        (acc, st) => (acc ? db`${acc} or ${condicaoStatus(st)}` : condicaoStatus(st)),
        null,
      );
      if (!statusSql) return [];
      return db<ReservaDetalhada[]>`
        ${selecionar()}
        where r.inicio < ${f.fim} and r.fim > ${f.inicio}
          and (${statusSql})
          ${f.salaId ? db`and r.sala_id = ${f.salaId}` : db``}
          ${f.tipo ? db`and s.tipo = ${f.tipo}` : db``}
          ${f.usuarioId ? db`and r.usuario_id = ${f.usuarioId}` : db``}
        order by r.inicio`;
    },
    async listarPendentesFuturas(agora) {
      return db<ReservaDetalhada[]>`
        ${selecionar()}
        where r.status = 'pendente' and r.inicio > ${agora}
        order by r.inicio`;
    },
  };
}
