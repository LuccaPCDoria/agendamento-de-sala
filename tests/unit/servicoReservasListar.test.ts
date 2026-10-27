import { describe, expect, it, vi } from 'vitest';
import { criarServicoReservas } from '../../server/services/reservas';
import { depsFalsas } from './fakes';
import type { Perfil } from '../../shared/tipos';
import type { FiltroReservas } from '../../shared/esquemas';
import type { ReservaDetalhada } from '../../server/tipos';

const perfil = (papel: 'admin' | 'usuario'): Perfil => ({ id: 'u1', nome: 'U', email: 'u@x.com', papel, ativo: true });
const f: FiltroReservas = { inicio: '2026-11-01T00:00:00-03:00', fim: '2026-11-08T00:00:00-03:00' };
const TRES = ['pendente', 'expirada', 'aprovada'];
const CINCO = ['pendente', 'expirada', 'aprovada', 'recusada', 'cancelada'];

function montar() {
  const deps = depsFalsas();
  vi.mocked(deps.repos.reservas.listar).mockResolvedValue([]);
  return deps;
}
const chamada = (deps: ReturnType<typeof montar>) => vi.mocked(deps.repos.reservas.listar).mock.calls[0][0];

describe('servicoReservas.listar', () => {
  it('professor sem minhas pedindo recusada → 400', async () => {
    const s = criarServicoReservas(montar());
    await expect(s.listar(perfil('usuario'), { ...f, status: ['recusada'] })).rejects.toMatchObject({
      status: 400, message: 'Filtro de status não permitido.',
    });
  });
  it('professor sem filtro → pendente, expirada, aprovada', async () => {
    const d = montar();
    await criarServicoReservas(d).listar(perfil('usuario'), f);
    expect(chamada(d).status).toEqual(TRES);
    expect(chamada(d).usuarioId).toBeUndefined();
  });
  it('minhas=true → usuarioId do próprio e cinco status', async () => {
    const d = montar();
    await criarServicoReservas(d).listar(perfil('usuario'), { ...f, minhas: true });
    expect(chamada(d).usuarioId).toBe('u1');
    expect(chamada(d).status).toEqual(CINCO);
  });
  it('minhas=true com filtro usa o filtro', async () => {
    const d = montar();
    await criarServicoReservas(d).listar(perfil('usuario'), { ...f, minhas: true, status: ['recusada'] });
    expect(chamada(d).status).toEqual(['recusada']);
  });
  it('admin sem filtro → pendente, expirada, aprovada', async () => {
    const d = montar();
    await criarServicoReservas(d).listar(perfil('admin'), f);
    expect(chamada(d).status).toEqual(TRES);
  });
  it('admin com filtro usa o filtro e converte datas e agora', async () => {
    const d = montar();
    await criarServicoReservas(d).listar(perfil('admin'), { ...f, status: ['cancelada'], salaId: 's1', tipo: 'reuniao' });
    expect(chamada(d)).toMatchObject({
      status: ['cancelada'], salaId: 's1', tipo: 'reuniao', inicio: new Date(f.inicio), fim: new Date(f.fim),
      agora: d.agora(),
    });
  });
});

describe('servicoReservas.listarPendentes', () => {
  it('lista pendentes futuras sem expor e-mail', async () => {
    const d = depsFalsas();
    vi.mocked(d.repos.reservas.listarPendentesFuturas).mockResolvedValue([
      {
        id: 'r1', salaId: 's', usuarioId: 'u', inicio: new Date('2027-01-01T10:00:00Z'), fim: new Date('2027-01-01T11:00:00Z'),
        status: 'pendente', finalidade: 'x', motivoRecusa: null, salaNome: 'S', salaTipo: 'reuniao',
        solicitanteNome: 'U', solicitanteEmail: 'u@x.com',
      } as ReservaDetalhada,
    ]);
    const r = await criarServicoReservas(d).listarPendentes();
    expect(vi.mocked(d.repos.reservas.listarPendentesFuturas)).toHaveBeenCalledWith(d.agora());
    expect(r).toHaveLength(1);
    expect(r[0]).not.toHaveProperty('solicitanteEmail');
  });
});
