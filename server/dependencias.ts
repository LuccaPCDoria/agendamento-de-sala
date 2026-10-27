import { criarRepos, criarSql, criarTransacao, type Repos, type Transacao } from './lib/db';
import { criarAuthAdmin } from './lib/supabaseAdmin';
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

/** Lê process.env apenas quando chamada (nunca na importação). */
export function dependenciasPadrao(): DependenciasApp {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não configurada');
  const supabaseUrl = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !chave) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas');
  const sql = criarSql(url);
  const { authAdmin, verificarToken } = criarAuthAdmin(supabaseUrl, chave);
  return {
    verificarToken,
    repos: criarRepos(sql),
    transacao: criarTransacao(sql),
    authAdmin,
    notificar: notificadorNulo,
    agora: () => new Date(),
  };
}
