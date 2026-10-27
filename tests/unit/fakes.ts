import { vi } from 'vitest';
import type { Repos } from '../../server/lib/db';
import type { DependenciasApp } from '../../server/dependencias';

/** Cada repositório é um Proxy que cria um vi.fn() por método acessado (sempre o mesmo). */
function repoFalso<T extends object>(): T {
  const fns = new Map<string | symbol, unknown>();
  return new Proxy({} as T, {
    get(_alvo, prop) {
      if (prop === 'then') return undefined;
      if (!fns.has(prop)) fns.set(prop, vi.fn());
      return fns.get(prop);
    },
  });
}

export function reposFalsos(): Repos {
  return {
    perfis: repoFalso(),
    salas: repoFalso(),
    reservas: repoFalso(),
    historico: repoFalso(),
  };
}

export function depsFalsas(sobrescritas: Partial<DependenciasApp> = {}): DependenciasApp {
  const repos = reposFalsos();
  return {
    verificarToken: vi.fn().mockResolvedValue(null),
    repos,
    transacao: (fn) => fn(repos),
    authAdmin: {
      criarUsuario: vi.fn(),
      atualizarUsuario: vi.fn(),
      excluirUsuario: vi.fn(),
      definirBloqueio: vi.fn(),
    },
    notificar: vi.fn().mockResolvedValue(undefined),
    agora: () => new Date('2026-11-02T08:00:00-03:00'),
    ...sobrescritas,
  };
}
