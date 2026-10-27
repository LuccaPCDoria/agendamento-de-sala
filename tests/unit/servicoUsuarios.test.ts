import { describe, expect, it, vi } from 'vitest';
import { criarServicoUsuarios } from '../../server/services/usuarios';
import { depsFalsas } from './fakes';
import { ErroApp } from '../../server/lib/erros';
import type { Perfil } from '../../shared/tipos';

const ID = '11111111-1111-4111-8111-111111111111';
const admin: Perfil = { id: 'adm', nome: 'Adm', email: 'adm@x.com', papel: 'admin', ativo: true };
const perfilEditado: Perfil = { id: ID, nome: 'P', email: 'p@x.com', papel: 'usuario', ativo: true };
const dados = { nome: 'Prof', email: 'prof@x.com', senha: 'senha1234', papel: 'usuario' as const };

describe('servicoUsuarios', () => {
  it('criar: cria no Auth e insere o perfil com o mesmo id', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.authAdmin.criarUsuario).mockResolvedValue('id-novo');
    vi.mocked(deps.repos.perfis.inserir).mockImplementation(async (p) => ({ ...p, ativo: true }));
    const r = await criarServicoUsuarios(deps).criar(dados);
    expect(deps.authAdmin.criarUsuario).toHaveBeenCalledWith('prof@x.com', 'senha1234');
    expect(deps.repos.perfis.inserir).toHaveBeenCalledWith({ id: 'id-novo', nome: 'Prof', email: 'prof@x.com', papel: 'usuario' });
    expect(r).not.toHaveProperty('senha');
  });
  it('criar: falha ao inserir perfil exclui a conta do Auth', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.authAdmin.criarUsuario).mockResolvedValue('id-novo');
    vi.mocked(deps.repos.perfis.inserir).mockRejectedValue(
      Object.assign(new Error(), { code: '23505', constraint_name: 'perfis_email_unico' }),
    );
    await expect(criarServicoUsuarios(deps).criar(dados)).rejects.toMatchObject({ code: '23505' });
    expect(deps.authAdmin.excluirUsuario).toHaveBeenCalledWith('id-novo');
  });
  it('editar: falha no Auth propaga o erro (rollback)', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.perfis.atualizar).mockResolvedValue(perfilEditado);
    vi.mocked(deps.authAdmin.atualizarUsuario).mockRejectedValue(new ErroApp(409, 'Já existe um usuário com este e-mail.'));
    await expect(criarServicoUsuarios(deps).editar(admin, ID, { email: 'b@x.com' })).rejects.toMatchObject({ status: 409 });
  });
  it('editar: não chama o Auth se só o nome mudou', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.perfis.atualizar).mockResolvedValue(perfilEditado);
    await criarServicoUsuarios(deps).editar(admin, ID, { nome: 'Novo' });
    expect(deps.repos.perfis.atualizar).toHaveBeenCalledWith(ID, { nome: 'Novo', email: undefined, papel: undefined });
    expect(deps.authAdmin.atualizarUsuario).not.toHaveBeenCalled();
  });
  it('editar: e-mail ou senha chamam o Auth', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.perfis.atualizar).mockResolvedValue(perfilEditado);
    await criarServicoUsuarios(deps).editar(admin, ID, { email: 'b@x.com', novaSenha: 'outra-senha1' });
    expect(deps.authAdmin.atualizarUsuario).toHaveBeenCalledWith(ID, { email: 'b@x.com', senha: 'outra-senha1' });
  });
  it('editar: usuário inexistente → 404', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.perfis.atualizar).mockResolvedValue(null);
    await expect(criarServicoUsuarios(deps).editar(admin, ID, { nome: 'X' })).rejects.toMatchObject({
      status: 404,
      message: 'Usuário não encontrado.',
    });
  });
  it('editar: admin não remove o próprio papel', async () => {
    const deps = depsFalsas();
    await expect(criarServicoUsuarios(deps).editar(admin, admin.id, { papel: 'usuario' })).rejects.toMatchObject({
      status: 400,
      message: 'Você não pode remover o seu próprio papel de administrador.',
    });
    expect(deps.repos.perfis.atualizar).not.toHaveBeenCalled();
  });
});
