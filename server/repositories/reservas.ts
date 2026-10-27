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
  /** Reservas com início em [inicio, fim), todos os status, por início. */
  listarPeriodo(inicio: Date, fim: Date): Promise<ReservaDetalhada[]>;
  listarPendentesFuturas(agora: Date): Promise<ReservaDetalhada[]>;
  /** Trava (for update) e cancela as reservas futuras pendentes/aprovadas da sala; devolve o status anterior. */
  cancelarFuturasDaSala(salaId: string): Promise<{ id: string; anterior: StatusReserva }[]>;
  /** Idem, para as reservas do usuário. */
  cancelarFuturasDoUsuario(usuarioId: string): Promise<{ id: string; anterior: StatusReserva }[]>;
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
  async function cancelarTravando(
    travar: () => Promise<{ id: string; status: StatusReserva }[]>,
  ): Promise<{ id: string; anterior: StatusReserva }[]> {
    const linhas = await travar();
    if (linhas.length === 0) return [];
    const ids = linhas.map((l) => l.id);
    await db`update reservas set status = 'cancelada', atualizado_em = now() where id = any(${db.array(ids, 2951)})`;
    return linhas.map((l) => ({ id: l.id, anterior: l.status }));
  }
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
    async listarPeriodo(inicio, fim) {
      return db<ReservaDetalhada[]>`
        ${selecionar()}
        where r.inicio >= ${inicio} and r.inicio < ${fim}
        order by r.inicio`;
    },
    async listarPendentesFuturas(agora) {
      return db<ReservaDetalhada[]>`
        ${selecionar()}
        where r.status = 'pendente' and r.inicio > ${agora}
        order by r.inicio`;
    },
    cancelarFuturasDaSala(salaId) {
      return cancelarTravando(() => db<{ id: string; status: StatusReserva }[]>`
        select id, status from reservas
        where sala_id = ${salaId} and status in ('pendente', 'aprovada') and inicio > now()
        order by id for update`);
    },
    cancelarFuturasDoUsuario(usuarioId) {
      return cancelarTravando(() => db<{ id: string; status: StatusReserva }[]>`
        select id, status from reservas
        where usuario_id = ${usuarioId} and status in ('pendente', 'aprovada') and inicio > now()
        order by id for update`);
    },
  };
}
