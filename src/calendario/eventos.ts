import type { EventInput } from '@fullcalendar/core';
import type { ReservaDTO } from '../../shared/tipos';

export const COR_APROVADA = '#22c55e';
export const COR_PENDENTE = '#facc15';
export const COR_EXPIRADA = '#9ca3af';

export function reservaParaEvento(r: ReservaDTO): EventInput {
  const cor = r.expirada ? COR_EXPIRADA : r.status === 'aprovada' ? COR_APROVADA : COR_PENDENTE;
  return {
    id: r.id,
    title: `${r.salaNome} · ${r.solicitanteNome}`,
    start: r.inicio,
    end: r.fim,
    backgroundColor: cor,
    borderColor: cor,
    textColor: cor === COR_PENDENTE ? '#1f2937' : '#ffffff',
    extendedProps: { reserva: r },
  };
}
