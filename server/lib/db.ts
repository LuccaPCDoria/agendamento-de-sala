import postgres from 'postgres';
import { criarRepoPerfis, type RepoPerfis } from '../repositories/perfis';
import { criarRepoSalas, type RepoSalas } from '../repositories/salas';
import { criarRepoReservas, type RepoReservas } from '../repositories/reservas';
import { criarRepoHistorico, type RepoHistorico } from '../repositories/historico';

export type Executor = postgres.Sql | postgres.TransactionSql;

export interface Repos {
  perfis: RepoPerfis;
  salas: RepoSalas;
  reservas: RepoReservas;
  historico: RepoHistorico;
}

export type Transacao = <T>(fn: (repos: Repos) => Promise<T>) => Promise<T>;

// Sem pipelining: o pooler de transação do Supabase (Supavisor, porta 6543) perde as
// respostas de consultas enviadas em pipeline na mesma conexão, e elas ficam pendentes
// para sempre — com max: 1, todas as consultas seguintes enfileiram atrás delas.
// `max_pipeline` é suportado pelo postgres.js em runtime, mas falta nos tipos dele.
const SEM_PIPELINE = { max_pipeline: 0 } as Record<string, unknown>;

export function criarSql(url: string): postgres.Sql {
  return postgres(url, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    transform: postgres.camel,
    ...SEM_PIPELINE,
  });
}

export function criarRepos(db: Executor): Repos {
  return {
    perfis: criarRepoPerfis(db),
    salas: criarRepoSalas(db),
    reservas: criarRepoReservas(db),
    historico: criarRepoHistorico(db),
  };
}

/**
 * Transação numa conexão reservada. Não usa `sql.begin`: com `max_pipeline: 0` o postgres.js
 * nunca chama o `onexecute` do BEGIN e `sql.begin` falha ("Cannot set properties of undefined").
 */
export function criarTransacao(sql: postgres.Sql): Transacao {
  return (async (fn: (repos: Repos) => Promise<unknown>) => {
    const conexao = await sql.reserve();
    try {
      await conexao`begin`;
      try {
        const resultado = await fn(criarRepos(conexao));
        await conexao`commit`;
        return resultado;
      } catch (err) {
        await conexao`rollback`.catch(() => undefined);
        throw err;
      }
    } finally {
      conexao.release();
    }
  }) as Transacao;
}
