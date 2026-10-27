import type { Executor } from '../lib/db';
import type { Sala } from '../../shared/tipos';
import type { DadosSala } from '../../shared/esquemas';

export interface RepoSalas {
  listar(incluirInativas: boolean): Promise<Sala[]>;
  buscarPorId(id: string): Promise<Sala | null>;
  buscarAtivaParaReserva(id: string): Promise<Sala | null>;
  inserir(d: DadosSala): Promise<Sala>;
  atualizar(id: string, d: Partial<DadosSala>): Promise<Sala | null>;
  definirAtiva(id: string, ativa: boolean): Promise<Sala | null>;
}

export function criarRepoSalas(db: Executor): RepoSalas {
  return {
    async listar(incluirInativas) {
      return db<Sala[]>`
        select id, nome, tipo, capacidade, recursos, ativa from salas
        where ${incluirInativas ? db`true` : db`ativa`}
        order by lower(nome), nome`;
    },
    async buscarPorId(id) {
      const [s] = await db<Sala[]>`
        select id, nome, tipo, capacidade, recursos, ativa from salas where id = ${id}`;
      return s ?? null;
    },
    async buscarAtivaParaReserva(id) {
      const [s] = await db<Sala[]>`
        select id, nome, tipo, capacidade, recursos, ativa from salas
        where id = ${id} and ativa for share`;
      return s ?? null;
    },
    async inserir(d) {
      const [s] = await db<Sala[]>`
        insert into salas (nome, tipo, capacidade, recursos)
        values (${d.nome}, ${d.tipo}, ${d.capacidade}, ${d.recursos})
        returning id, nome, tipo, capacidade, recursos, ativa`;
      return s;
    },
    async atualizar(id, d) {
      const [s] = await db<Sala[]>`
        update salas set
          nome = coalesce(${d.nome ?? null}, nome),
          tipo = coalesce(${d.tipo ?? null}, tipo),
          capacidade = coalesce(${d.capacidade ?? null}::int, capacidade),
          recursos = coalesce(${d.recursos ?? null}::text[], recursos)
        where id = ${id}
        returning id, nome, tipo, capacidade, recursos, ativa`;
      return s ?? null;
    },
    async definirAtiva(id, ativa) {
      const [s] = await db<Sala[]>`
        update salas set ativa = ${ativa} where id = ${id}
        returning id, nome, tipo, capacidade, recursos, ativa`;
      return s ?? null;
    },
  };
}
