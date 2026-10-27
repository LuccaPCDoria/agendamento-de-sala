import type { Executor } from '../lib/db';

// Os métodos são adicionados nas tarefas seguintes.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RepoHistorico {}

export function criarRepoHistorico(_db: Executor): RepoHistorico {
  return {};
}
