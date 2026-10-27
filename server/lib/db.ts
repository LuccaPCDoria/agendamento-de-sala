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

// max_pipeline: 0 — sem pipelining. Com a conexão ocupada, o postgres.js escreve as consultas
// seguintes em pipeline na mesma conexão; o pooler de transação do Supabase (Supavisor, porta
// 6543) responde só a primeira e as demais ficam pendentes para sempre — com max: 1, tudo o que
// enfileira depois trava (era o timeout de 30 s no netlify dev com requisições concorrentes).
// Com 0, as consultas são estritamente serializadas. A opção existe em runtime, mas falta nos
// tipos do postgres.js.
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

/** Erros que significam conexão morta: o postgres.js já a moveu para `closed` e reconecta sozinho. */
const ERROS_DE_CONEXAO = new Set([
  'CONNECTION_CLOSED',
  'CONNECTION_DESTROYED',
  'CONNECTION_ENDED',
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
]);

function erroDeConexao(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' && ERROS_DE_CONEXAO.has(code);
}

/**
 * Desfaz a transação após `err` e relança `err` (sempre o original).
 * - Conexão morta: nem ROLLBACK nem release — usar/devolver a conexão fechada quebra o
 *   postgres.js (write num socket nulo; conexão morta volta para `open`).
 * - ROLLBACK falhou com a conexão viva: o estado dela é desconhecido (pode seguir dentro do
 *   BEGIN), então não volta ao pool; como o postgres.js não expõe como encerrar uma conexão só,
 *   o cliente inteiro é encerrado (falha rápida em vez de rodar consultas numa transação suja).
 */
async function desfazer(sql: postgres.Sql, conexao: postgres.ReservedSql, err: unknown): Promise<never> {
  if (erroDeConexao(err)) throw err;
  try {
    await conexao`rollback`;
  } catch (errRollback) {
    if (!erroDeConexao(errRollback)) {
      console.error('ROLLBACK falhou com a conexão ativa; encerrando o cliente do banco.', errRollback);
      void sql.end({ timeout: 0 });
    }
    throw err;
  }
  conexao.release();
  throw err;
}

/**
 * Transação numa conexão reservada (não usa `sql.begin`: com `max_pipeline: 0` o postgres.js
 * nunca chama o `onexecute` do BEGIN e `sql.begin` falha com "Cannot set properties of undefined").
 *
 * Regra: dentro de `fn`, use SÓ os repos recebidos. Os repos de `deps.repos` usam o cliente base,
 * cuja única conexão (max: 1) está reservada para esta transação — a consulta esperaria para sempre.
 */
export function criarTransacao(sql: postgres.Sql): Transacao {
  return (async (fn: (repos: Repos) => Promise<unknown>) => {
    const conexao = await sql.reserve();
    let resultado: unknown;
    let fim: postgres.RowList<postgres.Row[]>;
    try {
      await conexao`begin`;
      resultado = await fn(criarRepos(conexao));
      fim = await conexao`commit`;
    } catch (err) {
      return desfazer(sql, conexao, err);
    }
    conexao.release();
    // COMMIT numa transação abortada (fn engoliu um erro do banco) vira ROLLBACK sem erro.
    if (fim.command === 'ROLLBACK') throw new Error('Transação abortada: nada foi gravado.');
    return resultado;
  }) as Transacao;
}
