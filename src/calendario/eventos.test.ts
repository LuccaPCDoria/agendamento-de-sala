import { describe, expect, it } from 'vitest';
import type { ReservaDTO } from '../../shared/tipos';
import { classeDoEvento, reservaParaEvento } from './eventos';

const r: ReservaDTO = {
  id: '1', salaId: 's', salaNome: 'Sala A', salaTipo: 'reuniao', usuarioId: 'u',
  solicitanteNome: 'Ana', inicio: '2026-11-02T13:00:00.000Z', fim: '2026-11-02T14:00:00.000Z',
  status: 'aprovada', finalidade: 'x', motivoRecusa: null, expirada: false,
};

describe('reservaParaEvento', () => {
  it.each([
    ['aprovada', false, 'evento-aprovada'],
    ['pendente', false, 'evento-pendente'],
    ['pendente', true, 'evento-expirada'],
  ] as const)('%s (expirada=%s) → %s', (status, expirada, classe) => {
    const rr = { ...r, status, expirada };
    expect(classeDoEvento(rr)).toBe(classe);
    expect(reservaParaEvento(rr).classNames).toEqual([classe]);
  });
  it('não define cores inline', () => {
    const e = reservaParaEvento(r);
    expect(e).not.toHaveProperty('backgroundColor');
    expect(e).not.toHaveProperty('borderColor');
    expect(e).not.toHaveProperty('textColor');
  });
  it('título e extendedProps', () => {
    const e = reservaParaEvento(r);
    expect(e.title).toBe('Sala A · Ana');
    expect(e.extendedProps?.reserva).toBe(r);
  });
});
