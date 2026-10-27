import type { Executor } from '../lib/db';
import type { Perfil } from '../../shared/tipos';
import type { Papel } from '../../shared/constantes';

export interface RepoPerfis {
  buscarPorId(id: string): Promise<Perfil | null>;
  listar(): Promise<Perfil[]>;
  inserir(p: Omit<Perfil, 'ativo'>): Promise<Perfil>;
  atualizar(id: string, campos: { nome?: string; email?: string; papel?: Papel }): Promise<Perfil | null>;
  buscarAtivoParaReserva(id: string): Promise<Perfil | null>;
  definirAtivo(id: string, ativo: boolean): Promise<Perfil | null>;
}

export function criarRepoPerfis(db: Executor): RepoPerfis {
  return {
    async buscarPorId(id) {
      const [perfil] = await db<Perfil[]>`
        select id, nome, email, papel, ativo from perfis where id = ${id}`;
      return perfil ?? null;
    },
    async listar() {
      return db<Perfil[]>`
        select id, nome, email, papel, ativo from perfis order by lower(nome), nome`;
    },
    async inserir(p) {
      const [perfil] = await db<Perfil[]>`
        insert into perfis (id, nome, email, papel)
        values (${p.id}, ${p.nome}, ${p.email}, ${p.papel})
        returning id, nome, email, papel, ativo`;
      return perfil;
    },
    async atualizar(id, campos) {
      const definidos = Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined));
      if (Object.keys(definidos).length === 0) return this.buscarPorId(id);
      const [perfil] = await db<Perfil[]>`
        update perfis set ${db(definidos)} where id = ${id}
        returning id, nome, email, papel, ativo`;
      return perfil ?? null;
    },
    async buscarAtivoParaReserva(id) {
      const [perfil] = await db<Perfil[]>`
        select id, nome, email, papel, ativo from perfis
        where id = ${id} and ativo for share`;
      return perfil ?? null;
    },
    async definirAtivo(id, ativo) {
      const [perfil] = await db<Perfil[]>`
        update perfis set ativo = ${ativo} where id = ${id}
        returning id, nome, email, papel, ativo`;
      return perfil ?? null;
    },
  };
}
