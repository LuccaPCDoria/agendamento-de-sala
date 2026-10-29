import type { StatusReserva } from '../../shared/constantes';
import { ROTULO_STATUS } from '../rotulos';

const CLASSES: Record<StatusReserva | 'expirada', string> = {
  aprovada: 'bg-primaria-suave text-primaria-forte',
  pendente: 'bg-coral-suave text-coral-forte',
  recusada: 'bg-erro-suave text-erro-forte',
  cancelada: 'bg-neutro-suave text-neutro-forte',
  expirada: 'border border-dashed border-neutro-forte bg-neutro-suave text-neutro-forte',
};

export function SeloStatus({ status, expirada = false }: { status: StatusReserva; expirada?: boolean }) {
  const chave = expirada ? 'expirada' : status;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 font-texto text-xs font-bold ${CLASSES[chave]}`}>
      {ROTULO_STATUS[chave]}
    </span>
  );
}
