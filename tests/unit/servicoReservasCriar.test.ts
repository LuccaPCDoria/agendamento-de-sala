import { describe, expect, it, vi } from 'vitest';
import { criarServicoReservas } from '../../server/services/reservas';
import { depsFalsas } from './fakes';
import type { Perfil } from '../../shared/tipos';
import type { ReservaDetalhada } from '../../server/tipos';

const SALA = '11111111-1111-4111-8111-111111111111';
const perfil = (papel: 'admin' | 'usuario'): Perfil => ({ id: 'u1', nome: 'U', email: 'u@x.com', papel, ativo: true });
const dados = { salaId: SALA, inicio: '2026-11-03T10:00:00-03:00', fim: '2026-11-03T11:00:00-03:00', finalidade: 'Aula' };

function montar(sobrescritas = {}) {
  const deps = depsFalsas(sobrescritas);
  const { repos } = deps;
  vi.mocked(repos.salas.buscarAtivaParaReserva).mockResolvedValue({ id: SALA, nome: 'S', tipo: 'reuniao', capacidade: 1, recursos: [], ativa: true });
  vi.mocked(repos.perfis.buscarAtivoParaReserva).mockImplementation(async (id) => ({ ...perfil('usuario'), id }));
  vi.mocked(repos.reservas.inserir).mockImplementation(async (d) => ({ id: 'r1', ...d, motivoRecusa: null } as never));
  vi.mocked(repos.reservas.buscarDetalhadas).mockImplementation(async () => [
    {
      id: 'r1', salaId: SALA, usuarioId: 'u1', inicio: new Date(dados.inicio), fim: new Date(dados.fim),
      status: vi.mocked(repos.reservas.inserir).mock.calls[0][0].status, finalidade: 'Aula', motivoRecusa: null,
      salaNome: 'S', salaTipo: 'reuniao', solicitanteNome: 'U', solicitanteEmail: 'u@x.com',
    } as ReservaDetalhada,
  ]);
  return { deps, repos };
}

describe('servicoReservas.criar', () => {
  it('professor → pendente; admin → aprovada', async () => {
    const a = montar();
    expect((await criarServicoReservas(a.deps).criar(perfil('usuario'), dados)).status).toBe('pendente');
    const b = montar();
    expect((await criarServicoReservas(b.deps).criar(perfil('admin'), dados)).status).toBe('aprovada');
  });
  it('grava histórico null → status inicial', async () => {
    const { deps, repos } = montar();
    await criarServicoReservas(deps).criar(perfil('usuario'), dados);
    expect(repos.historico.registrar).toHaveBeenCalledWith([
      expect.objectContaining({ anterior: null, novo: 'pendente', alteradoPor: 'u1' }),
    ]);
  });
  it('domingo → 400 com a mensagem de horário', async () => {
    const { deps } = montar();
    await expect(
      criarServicoReservas(deps).criar(perfil('usuario'), { ...dados, inicio: '2026-11-08T10:00:00-03:00', fim: '2026-11-08T11:00:00-03:00' }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('sala inativa → 400 "Sala inexistente ou inativa."', async () => {
    const { deps, repos } = montar();
    vi.mocked(repos.salas.buscarAtivaParaReserva).mockResolvedValue(null);
    await expect(criarServicoReservas(deps).criar(perfil('usuario'), dados)).rejects.toMatchObject({
      status: 400, message: 'Sala inexistente ou inativa.',
    });
  });
  it('perfil inativo → 403', async () => {
    const { deps, repos } = montar();
    vi.mocked(repos.perfis.buscarAtivoParaReserva).mockResolvedValue(null);
    await expect(criarServicoReservas(deps).criar(perfil('usuario'), dados)).rejects.toMatchObject({ status: 403 });
  });
  it('não notifica na criação por professor (RNF001) e notifica "confirmada" para admin', async () => {
    const a = montar();
    await criarServicoReservas(a.deps).criar(perfil('usuario'), dados);
    expect(a.deps.notificar).not.toHaveBeenCalled();
    const b = montar();
    await criarServicoReservas(b.deps).criar(perfil('admin'), dados);
    expect(b.deps.notificar).toHaveBeenCalledWith([expect.objectContaining({ tipo: 'confirmada' })]);
  });
  it('notifica só depois do commit', async () => {
    const ordem: string[] = [];
    const base = depsFalsas();
    const { deps, repos } = montar({
      transacao: async (fn: never) => {
        const r = await (fn as (x: unknown) => Promise<unknown>)(base.repos);
        ordem.push('commit');
        return r;
      },
      notificar: vi.fn(async () => { ordem.push('notificar'); }),
    });
    void repos;
    // os repos usados são os de `base` (passados a fn): reconfigura-os
    const r = base.repos;
    vi.mocked(r.salas.buscarAtivaParaReserva).mockResolvedValue({ id: SALA, nome: 'S', tipo: 'reuniao', capacidade: 1, recursos: [], ativa: true });
    vi.mocked(r.perfis.buscarAtivoParaReserva).mockResolvedValue(perfil('admin'));
    vi.mocked(r.reservas.inserir).mockResolvedValue({ id: 'r1' } as never);
    vi.mocked(r.reservas.buscarDetalhadas).mockResolvedValue([
      { id: 'r1', usuarioId: 'u1', inicio: new Date(dados.inicio), fim: new Date(dados.fim), status: 'aprovada', solicitanteEmail: 'u@x.com', solicitanteNome: 'U' } as ReservaDetalhada,
    ]);
    await criarServicoReservas(deps).criar(perfil('admin'), dados);
    expect(ordem).toEqual(['commit', 'notificar']);
  });
});
