import { describe, expect, it, vi } from 'vitest';
import { criarServicoRelatorios } from '../../server/services/relatorios';
import { depsFalsas } from './fakes';
import type { ReservaDetalhada } from '../../server/tipos';

const det = (id: string, status: ReservaDetalhada['status'], inicio: string): ReservaDetalhada => ({
  id, salaId: 's1', usuarioId: 'u1', inicio: new Date(inicio), fim: new Date(new Date(inicio).getTime() + 3600000),
  status, finalidade: 'F', motivoRecusa: null, criadoEm: new Date(), atualizadoEm: new Date(),
  salaNome: 'Sala', salaTipo: 'reuniao', solicitanteNome: 'Ana', solicitanteEmail: 'a@x.com',
} as ReservaDetalhada);

describe('servicoRelatorios.mensal', () => {
  it('totais contam pendente vencida como expirada e trazem as cinco chaves', async () => {
    const deps = depsFalsas(); // agora = 2026-11-02 08:00 -03
    vi.mocked(deps.repos.reservas.listarPeriodo).mockResolvedValue([
      det('1', 'pendente', '2026-11-01T12:00:00-03:00'),
      det('2', 'pendente', '2026-11-20T12:00:00-03:00'),
      det('3', 'aprovada', '2026-11-21T12:00:00-03:00'),
    ]);
    const r = await criarServicoRelatorios(deps).mensal('2026-11');
    expect(r.mes).toBe('2026-11');
    expect(r.totais).toEqual({ pendente: 1, expirada: 1, aprovada: 1, recusada: 0, cancelada: 0 });
    expect(r.reservas).toHaveLength(3);
    expect(r.reservas[0].expirada).toBe(true);
    const [ini, fim] = vi.mocked(deps.repos.reservas.listarPeriodo).mock.calls[0];
    expect(ini).toEqual(new Date('2026-11-01T03:00:00Z'));
    expect(fim).toEqual(new Date('2026-12-01T03:00:00Z'));
  });
});
