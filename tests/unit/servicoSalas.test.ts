import { describe, expect, it, vi } from 'vitest';
import { criarServicoSalas } from '../../server/services/salas';
import { depsFalsas } from './fakes';
import type { Perfil } from '../../shared/tipos';

const ID = '11111111-1111-4111-8111-111111111111';
const perfil = (papel: 'admin' | 'usuario'): Perfil => ({ id: 'u', nome: 'U', email: 'u@x.com', papel, ativo: true });

describe('servicoSalas', () => {
  it('professor nunca recebe inativas', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.salas.listar).mockResolvedValue([]);
    await criarServicoSalas(deps).listar(perfil('usuario'), true);
    expect(deps.repos.salas.listar).toHaveBeenCalledWith(false);
  });
  it('admin recebe inativas quando pede', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.salas.listar).mockResolvedValue([]);
    await criarServicoSalas(deps).listar(perfil('admin'), true);
    expect(deps.repos.salas.listar).toHaveBeenCalledWith(true);
  });
  it('editar inexistente → 404', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.salas.atualizar).mockResolvedValue(null);
    await expect(criarServicoSalas(deps).editar(ID, { nome: 'X' })).rejects.toMatchObject({ status: 404, message: 'Sala não encontrada.' });
  });
});
