import type { EventInput } from '@fullcalendar/core';
import type { ReservaDTO } from '../../shared/tipos';

export type ClasseEvento = 'evento-aprovada' | 'evento-pendente' | 'evento-expirada';

export function classeDoEvento(r: ReservaDTO): ClasseEvento {
  if (r.expirada) return 'evento-expirada';
  return r.status === 'aprovada' ? 'evento-aprovada' : 'evento-pendente';
}

export function reservaParaEvento(r: ReservaDTO): EventInput {
  return {
    id: r.id,
    title: `${r.salaNome} · ${r.solicitanteNome}`,
    start: r.inicio,
    end: r.fim,
    classNames: [classeDoEvento(r)],
    extendedProps: { reserva: r },
  };
}
