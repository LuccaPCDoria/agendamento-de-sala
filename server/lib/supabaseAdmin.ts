import { createClient } from '@supabase/supabase-js';
import type { AuthAdmin, DependenciasApp } from '../dependencias';
import { conflito } from './erros';

interface ErroAuth {
  code?: string;
  status?: number;
  message?: string;
}

function lancar(error: ErroAuth | null): void {
  if (!error) return;
  if (error.code === 'email_exists' || error.status === 422) {
    throw conflito('Já existe um usuário com este e-mail.');
  }
  throw error;
}

export function criarAuthAdmin(
  url: string,
  serviceRoleKey: string,
): { authAdmin: AuthAdmin; verificarToken: DependenciasApp['verificarToken'] } {
  const cliente = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = cliente.auth.admin;

  const authAdmin: AuthAdmin = {
    async criarUsuario(email, senha) {
      const { data, error } = await admin.createUser({ email, password: senha, email_confirm: true });
      lancar(error);
      if (!data.user) throw new Error('Falha ao criar usuário no Auth');
      return data.user.id;
    },
    async atualizarUsuario(id, dados) {
      const { error } = await admin.updateUserById(id, {
        ...(dados.email !== undefined ? { email: dados.email } : {}),
        ...(dados.senha !== undefined ? { password: dados.senha } : {}),
        email_confirm: true,
      });
      lancar(error);
    },
    async excluirUsuario(id) {
      const { error } = await admin.deleteUser(id);
      lancar(error);
    },
    async definirBloqueio(id, bloqueado) {
      const { error } = await admin.updateUserById(id, { ban_duration: bloqueado ? '876000h' : 'none' });
      lancar(error);
    },
  };

  const verificarToken: DependenciasApp['verificarToken'] = async (token) => {
    const { data, error } = await cliente.auth.getUser(token);
    if (error || !data.user || !data.user.email) return null;
    return { id: data.user.id, email: data.user.email };
  };

  return { authAdmin, verificarToken };
}
