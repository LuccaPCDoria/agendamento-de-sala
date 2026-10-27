import { useState } from 'react';
import type { ReservaDTO } from '../../shared/tipos';
import { useAuth } from '../auth/AuthProvider';
import ModalDetalhes, { formatarPeriodo } from '../calendario/ModalDetalhes';
import { ROTULO_STATUS } from '../rotulos';

interface Props { reservas: ReservaDTO[]; vazio: string }

export default function ListaReservas({ reservas, vazio }: Props) {
  const { perfil } = useAuth();
  const [aberta, setAberta] = useState<ReservaDTO | null>(null);
  if (reservas.length === 0) return <p className="text-sm text-slate-600">{vazio}</p>;
  return (
    <>
      <ul className="divide-y rounded border">
        {reservas.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => setAberta(r)}
              className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left text-sm hover:bg-slate-50">
              <span>
                <strong>{r.salaNome}</strong> · {formatarPeriodo(r.inicio, r.fim)}
                <span className="block text-slate-600">{r.solicitanteNome} — {r.finalidade}</span>
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                {r.expirada ? ROTULO_STATUS.expirada : ROTULO_STATUS[r.status]}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {aberta && perfil && <ModalDetalhes reserva={aberta} perfil={perfil} aoFechar={() => setAberta(null)} />}
    </>
  );
}
