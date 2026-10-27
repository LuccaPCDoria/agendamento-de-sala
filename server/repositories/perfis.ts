import type { Executor } from '../lib/db';
import type { Perfil } from '../../shared/tipos';

export interface RepoPerfis {
  buscarPorId(id: string): Promise<Perfil | null>;
}

export function criarRepoPerfis(db: Executor): RepoPerfis {
  return {
    async buscarPorId(id) {
      const [perfil] = await db<Perfil[]>`
        select id, nome, email, papel, ativo from perfis where id = ${id}`;
      return perfil ?? null;
    },
  };
}
