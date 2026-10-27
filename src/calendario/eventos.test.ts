import { describe, expect, it } from 'vitest';
import type { ReservaDTO } from '../../shared/tipos';
import { reservaParaEvento } from './eventos';

const r: ReservaDTO = {
  id: '1', salaId: 's', salaNome: 'Sala A', salaTipo: 'reuniao', usuarioId: 'u',
  solicitanteNome: 'Ana', inicio: '2026-11-02T13:00:00.000Z', fim: '2026-11-02T14:00:00.000Z',
  status: 'aprovada', finalidade: 'x', motivoRecusa: null, expirada: false,
};

describe('reservaParaEvento', () => {
  it('cores por status', () => {
    expect(reservaParaEvento({ ...r, status: 'aprovada', expirada: false }).backgroundColor).toBe('#22c55e');
    expect(reservaParaEvento({ ...r, status: 'pendente', expirada: false }).backgroundColor).toBe('#facc15');
    expect(reservaParaEvento({ ...r, status: 'pendente', expirada: true }).backgroundColor).toBe('#9ca3af');
  });
  it('título e extendedProps', () => {
    const e = reservaParaEvento(r);
    expect(e.title).toBe('Sala A · Ana');
    expect(e.extendedProps?.reserva).toBe(r);
  });
});
