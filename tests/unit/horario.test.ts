import { describe, it, expect } from 'vitest';
import { validarJanelaReserva } from '../../shared/horario';

const agora = new Date('2026-11-02T08:00:00-03:00'); // segunda
const v = (i: string, f: string) => validarJanelaReserva(new Date(i), new Date(f), agora);

describe('validarJanelaReserva', () => {
  it('aceita segunda 10h–11h', () => expect(v('2026-11-03T10:00:00-03:00', '2026-11-03T11:00:00-03:00')).toBeNull());
  it('aceita 07:00–07:15 e 22:00–23:00 (limites)', () => {
    expect(v('2026-11-03T07:00:00-03:00', '2026-11-03T07:15:00-03:00')).toBeNull();
    expect(v('2026-11-03T22:00:00-03:00', '2026-11-03T23:00:00-03:00')).toBeNull();
  });
  it('rejeita fim antes do início', () => expect(v('2026-11-03T11:00:00-03:00', '2026-11-03T10:00:00-03:00')).toBe('O horário de término deve ser depois do início.'));
  it('rejeita passado', () => expect(v('2026-11-02T07:30:00-03:00', '2026-11-02T09:00:00-03:00')).toBe('Não é possível reservar no passado.'));
  it('rejeita dias diferentes', () => expect(v('2026-11-03T22:30:00-03:00', '2026-11-04T07:30:00-03:00')).toBe('A reserva deve começar e terminar no mesmo dia.'));
  it('reserva às 22h em Brasília (01h UTC do dia seguinte) é mesmo dia', () => expect(v('2026-11-04T01:00:00Z', '2026-11-04T01:45:00Z')).toBeNull());
  it('rejeita domingo', () => expect(v('2026-11-08T10:00:00-03:00', '2026-11-08T11:00:00-03:00')).toBe('Reservas só podem ser feitas de segunda a sábado.'));
  it('aceita sábado', () => expect(v('2026-11-07T10:00:00-03:00', '2026-11-07T11:00:00-03:00')).toBeNull());
  it('rejeita 06:59 e fim 23:01', () => {
    expect(v('2026-11-03T06:59:00-03:00', '2026-11-03T08:00:00-03:00')).toBe('Reservas só podem ser feitas entre 07:00 e 23:00.');
    expect(v('2026-11-03T22:00:00-03:00', '2026-11-03T23:01:00-03:00')).toBe('Reservas só podem ser feitas entre 07:00 e 23:00.');
  });
  it('rejeita 14 minutos', () => expect(v('2026-11-03T10:00:00-03:00', '2026-11-03T10:14:00-03:00')).toBe('A reserva deve ter pelo menos 15 minutos.'));
});
