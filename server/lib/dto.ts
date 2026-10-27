import type { ReservaDTO } from '../../shared/tipos';
import type { ReservaDetalhada } from '../tipos';

export function paraReservaDTO(r: ReservaDetalhada, agora: Date): ReservaDTO {
  return {
    id: r.id,
    salaId: r.salaId,
    salaNome: r.salaNome,
    salaTipo: r.salaTipo,
    usuarioId: r.usuarioId,
    solicitanteNome: r.solicitanteNome,
    inicio: r.inicio.toISOString(),
    fim: r.fim.toISOString(),
    status: r.status,
    finalidade: r.finalidade,
    motivoRecusa: r.motivoRecusa,
    expirada: r.status === 'pendente' && r.inicio <= agora,
  };
}
