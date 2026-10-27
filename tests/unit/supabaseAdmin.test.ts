import { describe, it, expect, vi, beforeEach } from 'vitest';

const admin = { createUser: vi.fn(), updateUserById: vi.fn(), deleteUser: vi.fn() };
const getUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { admin, getUser } }) }));

import { criarAuthAdmin } from '../../server/lib/supabaseAdmin';
import { ErroApp } from '../../server/lib/erros';

const { authAdmin, verificarToken } = criarAuthAdmin('http://x', 'k');
beforeEach(() => vi.clearAllMocks());

describe('erros do Auth', () => {
  it('email_exists → 409', async () => {
    admin.createUser.mockResolvedValue({ data: {}, error: { code: 'email_exists', status: 422 } });
    await expect(authAdmin.criarUsuario('a@b.c', 'x')).rejects.toMatchObject({ status: 409 });
    admin.updateUserById.mockResolvedValue({ error: { code: 'email_exists', status: 422 } });
    await expect(authAdmin.atualizarUsuario('1', { email: 'a@b.c' })).rejects.toBeInstanceOf(ErroApp);
  });
  it('weak_password 422 → não é 409', async () => {
    const erro = { code: 'weak_password', status: 422 };
    admin.createUser.mockResolvedValue({ data: {}, error: erro });
    await expect(authAdmin.criarUsuario('a@b.c', 'x')).rejects.toBe(erro);
  });
  it('excluir/bloquear não mapeiam 422', async () => {
    const erro = { status: 422 };
    admin.deleteUser.mockResolvedValue({ error: erro });
    await expect(authAdmin.excluirUsuario('1')).rejects.toBe(erro);
    admin.updateUserById.mockResolvedValue({ error: erro });
    await expect(authAdmin.definirBloqueio('1', true)).rejects.toBe(erro);
  });
});

describe('verificarToken', () => {
  it('rejeição de credencial → null', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    expect(await verificarToken('t')).toBeNull();
  });
  it('erro de rede/5xx → lança', async () => {
    const erro = { status: 503 };
    getUser.mockResolvedValue({ data: { user: null }, error: erro });
    await expect(verificarToken('t')).rejects.toBe(erro);
  });
  it('ok → id e e-mail', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u', email: 'e@x.c' } }, error: null });
    expect(await verificarToken('t')).toEqual({ id: 'u', email: 'e@x.c' });
  });
});
