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

export function criarSql(url: string): postgres.Sql {
  return postgres(url, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    transform: postgres.camel,
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

export function criarTransacao(sql: postgres.Sql): Transacao {
  return (async (fn: (repos: Repos) => Promise<unknown>) =>
    sql.begin((tx) => fn(criarRepos(tx)))) as Transacao;
}
