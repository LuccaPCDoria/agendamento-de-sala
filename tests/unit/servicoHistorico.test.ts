import { describe, expect, it, vi } from 'vitest';
import { criarServicoReservas } from '../../server/services/reservas';
import { depsFalsas } from './fakes';
import type { Perfil } from '../../shared/tipos';
import type { Reserva } from '../../server/tipos';

const ID = '22222222-2222-4222-8222-222222222222';
const professor: Perfil = { id: 'u1', nome: 'P', email: 'p@x.com', papel: 'usuario', ativo: true };
const admin: Perfil = { ...professor, id: 'a1', papel: 'admin' };
const reserva = { id: ID, usuarioId: 'u1', status: 'pendente' } as Reserva;
const entradas = [
  { statusAnterior: null, statusNovo: 'pendente', alteradoPorNome: 'P', alteradoEm: '2026-11-02T10:00:00.000Z' },
];

function montar() {
  const deps = depsFalsas();
  vi.mocked(deps.repos.reservas.buscarPorId).mockResolvedValue(reserva);
  vi.mocked(deps.repos.historico.listarDaReserva).mockResolvedValue(entradas as never);
  return { deps, servico: criarServicoReservas(deps) };
}

describe('servicoReservas.historico', () => {
  it('404 se a reserva não existe', async () => {
    const { deps, servico } = montar();
    vi.mocked(deps.repos.reservas.buscarPorId).mockResolvedValue(null);
    await expect(servico.historico(professor, ID)).rejects.toMatchObject({ status: 404, message: 'Reserva não encontrada.' });
    expect(deps.repos.historico.listarDaReserva).not.toHaveBeenCalled();
  });
  it('403 para professor que não é dono', async () => {
    const { deps, servico } = montar();
    vi.mocked(deps.repos.reservas.buscarPorId).mockResolvedValue({ ...reserva, usuarioId: 'outro' });
    await expect(servico.historico(professor, ID)).rejects.toMatchObject({ status: 403 });
    expect(deps.repos.historico.listarDaReserva).not.toHaveBeenCalled();
  });
  it('dono e admin recebem o histórico', async () => {
    const { deps, servico } = montar();
    expect(await servico.historico(professor, ID)).toEqual(entradas);
    vi.mocked(deps.repos.reservas.buscarPorId).mockResolvedValue({ ...reserva, usuarioId: 'outro' });
    expect(await servico.historico(admin, ID)).toEqual(entradas);
    expect(deps.repos.historico.listarDaReserva).toHaveBeenCalledWith(ID);
  });
});
