import type { Executor } from '../lib/db';

// Os métodos são adicionados nas tarefas seguintes.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RepoSalas {}

export function criarRepoSalas(_db: Executor): RepoSalas {
  return {};
}
