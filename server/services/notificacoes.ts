import type { ReservaDetalhada } from '../tipos';
import type { EventoEmail, TipoEmail } from '../lib/notificador';

/** Um evento por solicitante (usuarioId), preservando a ordem de aparição. */
export function agruparPorSolicitante(reservas: ReservaDetalhada[], tipo: TipoEmail): EventoEmail[] {
  const grupos = new Map<string, EventoEmail>();
  for (const r of reservas) {
    const g = grupos.get(r.usuarioId);
    if (g) g.reservas.push(r);
    else grupos.set(r.usuarioId, { para: r.solicitanteEmail, nome: r.solicitanteNome, tipo, reservas: [r] });
  }
  return [...grupos.values()];
}
