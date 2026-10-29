import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReservaDTO } from '../../shared/tipos';
import { useAuth } from '../auth/AuthProvider';
import ModalDetalhes, { formatarPeriodo } from '../calendario/ModalDetalhes';
import { Cartao } from '../ui/Cartao';
import { EstadoVazio } from '../ui/EstadoVazio';
import { Hora } from '../ui/Hora';
import { SeloStatus } from '../ui/SeloStatus';

interface Props { reservas: ReservaDTO[]; vazio: { icone: LucideIcon; mensagem: string } }

const BARRA: Record<ReservaDTO['status'], string> = {
  aprovada: 'bg-primaria',
  pendente: 'bg-coral',
  recusada: 'bg-erro',
  cancelada: 'bg-neutro-forte',
};

export default function ListaReservas({ reservas, vazio }: Props) {
  const { perfil } = useAuth();
  const [aberta, setAberta] = useState<ReservaDTO | null>(null);
  if (reservas.length === 0) return <EstadoVazio icone={vazio.icone} mensagem={vazio.mensagem} />;
  return (
    <>
      <ul className="space-y-2">
        {reservas.map((r) => (
          <Cartao as="li" key={r.id} className="overflow-hidden hover:bg-superficie-2">
            <button type="button" onClick={() => setAberta(r)}
              className="flex w-full items-stretch gap-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 focus-visible:ring-offset-superficie">
              <span aria-hidden="true" className={`w-[5px] shrink-0 ${r.expirada ? BARRA.cancelada : BARRA[r.status]}`} />
              <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 py-3 pr-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-texto">{r.salaNome}</span>
                  <span className="block truncate text-texto">{r.finalidade}</span>
                  <span className="block truncate text-suave">{r.solicitanteNome}</span>
                  <Hora className="block text-xs text-suave">{formatarPeriodo(r.inicio, r.fim)}</Hora>
                  {r.status === 'recusada' && r.motivoRecusa && (
                    <span className="mt-1 block line-clamp-2 break-words text-erro-forte">Motivo: {r.motivoRecusa}</span>
                  )}
                </span>
                <SeloStatus status={r.status} expirada={r.expirada} />
              </span>
            </button>
          </Cartao>
        ))}
      </ul>
      {aberta && perfil && <ModalDetalhes reserva={aberta} perfil={perfil} aoFechar={() => setAberta(null)} />}
    </>
  );
}
