import { criarRepos, criarSql, criarTransacao, type Repos, type Transacao } from './lib/db';
import { notificadorNulo, type Notificador } from './lib/notificador';

export interface AuthAdmin {
  criarUsuario(email: string, senha: string): Promise<string>;
  atualizarUsuario(id: string, dados: { email?: string; senha?: string }): Promise<void>;
  excluirUsuario(id: string): Promise<void>;
  definirBloqueio(id: string, bloqueado: boolean): Promise<void>;
}

export interface DependenciasApp {
  verificarToken: (token: string) => Promise<{ id: string; email: string } | null>;
  /** Ligados ao sql base — só para leituras fora de transação. */
  repos: Repos;
  transacao: Transacao;
  authAdmin: AuthAdmin;
  notificar: Notificador;
  agora: () => Date;
}

const naoImplementado = async (): Promise<never> => {
  throw new Error('não implementado');
};

/** Lê process.env apenas quando chamada (nunca na importação). */
export function dependenciasPadrao(): DependenciasApp {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não configurada');
  const sql = criarSql(url);
  return {
    verificarToken: async () => null, // implementação real na Task 5
    repos: criarRepos(sql),
    transacao: criarTransacao(sql),
    authAdmin: {
      criarUsuario: naoImplementado,
      atualizarUsuario: naoImplementado,
      excluirUsuario: naoImplementado,
      definirBloqueio: naoImplementado,
    },
    notificar: notificadorNulo,
    agora: () => new Date(),
  };
}
