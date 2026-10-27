import { describe, expect, it, vi } from 'vitest';
import { criarServicoReservas } from '../../server/services/reservas';
import { depsFalsas } from './fakes';
import type { Perfil } from '../../shared/tipos';
import type { Reserva, ReservaDetalhada } from '../../server/tipos';

const ID = '22222222-2222-4222-8222-222222222222';
const professor: Perfil = { id: 'u1', nome: 'P', email: 'p@x.com', papel: 'usuario', ativo: true };
const admin: Perfil = { ...professor, id: 'a1', papel: 'admin' };
const reserva = {
  id: ID, salaId: 's1', usuarioId: 'u1', inicio: new Date('2026-11-03T13:00:00Z'), fim: new Date('2026-11-03T14:00:00Z'),
  status: 'pendente', finalidade: 'Aula', motivoRecusa: null,
} as Reserva;

function montar() {
  const deps = depsFalsas();
  const { repos } = deps;
  vi.mocked(repos.reservas.buscarPorId).mockResolvedValue(reserva);
  vi.mocked(repos.reservas.transicionar).mockImplementation(async (p) => ({ ...reserva, status: p.novo, motivoRecusa: p.motivo ?? null }));
  vi.mocked(repos.reservas.buscarDetalhadas).mockImplementation(async () => [
    { ...reserva, salaNome: 'S', salaTipo: 'reuniao', solicitanteNome: 'P', solicitanteEmail: 'p@x.com' } as ReservaDetalhada,
  ]);
  return { deps, repos, servico: criarServicoReservas(deps) };
}

describe('servicoReservas transições', () => {
  it('ordem 404 → 403 → 409', async () => {
    const { repos, servico } = montar();
    vi.mocked(repos.reservas.buscarPorId).mockResolvedValue(null);
    await expect(servico.cancelar(professor, ID)).rejects.toMatchObject({ status: 404, message: 'Reserva não encontrada.' });
    vi.mocked(repos.reservas.buscarPorId).mockResolvedValue({ ...reserva, usuarioId: 'outro' });
    await expect(servico.cancelar(professor, ID)).rejects.toMatchObject({ status: 403 });
    vi.mocked(repos.reservas.buscarPorId).mockResolvedValue({ ...reserva, usuarioId: professor.id });
    vi.mocked(repos.reservas.transicionar).mockResolvedValue(null);
    await expect(servico.cancelar(professor, ID)).rejects.toMatchObject({ status: 409, message: 'Esta reserva não pode mais ser alterada.' });
    expect(repos.historico.registrar).not.toHaveBeenCalled();
  });
  it('admin cancela reserva alheia', async () => {
    const { repos, servico } = montar();
    vi.mocked(repos.reservas.buscarPorId).mockResolvedValue({ ...reserva, usuarioId: 'outro' });
    await servico.cancelar(admin, ID);
    expect(repos.reservas.transicionar).toHaveBeenCalledWith(
      expect.objectContaining({ id: ID, novo: 'cancelada', permitidos: ['pendente', 'aprovada'], exigirSalaAtiva: false }),
    );
  });
  it('aprovar passa permitidos [pendente] e exigirSalaAtiva true', async () => {
    const { repos, servico } = montar();
    await servico.aprovar(admin, ID);
    expect(repos.reservas.transicionar).toHaveBeenCalledWith({
      id: ID, novo: 'aprovada', permitidos: ['pendente'], exigirSalaAtiva: true,
    });
  });
  it('recusar grava motivo e histórico pendente → recusada', async () => {
    const { repos, servico } = montar();
    const dto = await servico.recusar(admin, ID, 'Sem vaga');
    expect(repos.reservas.transicionar).toHaveBeenCalledWith({
      id: ID, novo: 'recusada', permitidos: ['pendente'], motivo: 'Sem vaga', exigirSalaAtiva: false,
    });
    expect(repos.historico.registrar).toHaveBeenCalledWith([
      { reservaId: ID, anterior: 'pendente', novo: 'recusada', alteradoPor: 'a1' },
    ]);
    expect(dto.id).toBe(ID);
  });
  it('notifica o tipo correto em cada ação', async () => {
    const { deps, servico } = montar();
    await servico.aprovar(admin, ID);
    await servico.recusar(admin, ID, 'x');
    await servico.cancelar(admin, ID);
    const tipos = vi.mocked(deps.notificar).mock.calls.map((c) => c[0][0].tipo);
    expect(tipos).toEqual(['aprovada', 'recusada', 'cancelada']);
  });
  it('não notifica quando a transição falha', async () => {
    const { deps, repos, servico } = montar();
    vi.mocked(repos.reservas.transicionar).mockResolvedValue(null);
    await expect(servico.aprovar(admin, ID)).rejects.toMatchObject({ status: 409 });
    expect(deps.notificar).not.toHaveBeenCalled();
  });
});
