import { useState } from 'react';
import { esquemaRecusar } from '../../shared/esquemas';
import type { Perfil, ReservaDTO } from '../../shared/tipos';
import Modal from '../components/Modal';
import { useAprovar, useCancelar, useRecusar } from '../consultas/reservas';
import { ROTULO_STATUS } from '../rotulos';

interface Props { reserva: ReservaDTO; perfil: Perfil; aoFechar: () => void }

const dois = (n: number) => String(n).padStart(2, '0');

export function formatarPeriodo(inicio: string, fim: string): string {
  const i = new Date(inicio);
  const f = new Date(fim);
  const hora = (d: Date) => `${dois(d.getHours())}:${dois(d.getMinutes())}`;
  return `${dois(i.getDate())}/${dois(i.getMonth() + 1)}/${i.getFullYear()} ${hora(i)}–${hora(f)}`;
}

export default function ModalDetalhes({ reserva, perfil, aoFechar }: Props) {
  const aprovar = useAprovar();
  const recusar = useRecusar();
  const cancelar = useCancelar();
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erroMotivo, setErroMotivo] = useState<string | null>(null);

  const admin = perfil.papel === 'admin';
  const ativa = (reserva.status === 'pendente' || reserva.status === 'aprovada') && !reserva.expirada;
  const podeCancelar = ativa && (admin || reserva.usuarioId === perfil.id);
  const podeDecidir = admin && reserva.status === 'pendente' && !reserva.expirada;
  const ocupado = aprovar.isPending || recusar.isPending || cancelar.isPending;
  const erro = aprovar.error?.message ?? recusar.error?.message ?? cancelar.error?.message ?? null;
  const status = reserva.expirada ? ROTULO_STATUS.expirada : ROTULO_STATUS[reserva.status];

  async function executar(p: Promise<unknown>) {
    try { await p; aoFechar(); } catch { /* erro exibido no modal */ }
  }

  function confirmarRecusa() {
    const r = esquemaRecusar.safeParse({ motivo });
    if (!r.success) { setErroMotivo(r.error.issues[0].message); return; }
    setErroMotivo(null);
    void executar(recusar.mutateAsync({ id: reserva.id, motivo: r.data.motivo }));
  }

  return (
    <Modal titulo="Detalhes da reserva" aoFechar={aoFechar}>
      <dl className="space-y-1 text-sm">
        <div><dt className="inline font-medium">Sala: </dt><dd className="inline">{reserva.salaNome}</dd></div>
        <div><dt className="inline font-medium">Horário: </dt>
          <dd className="inline">{formatarPeriodo(reserva.inicio, reserva.fim)}</dd></div>
        <div><dt className="inline font-medium">Solicitante: </dt><dd className="inline">{reserva.solicitanteNome}</dd></div>
        <div><dt className="inline font-medium">Finalidade: </dt><dd className="inline">{reserva.finalidade}</dd></div>
        <div><dt className="inline font-medium">Status: </dt><dd className="inline">{status}</dd></div>
        {reserva.motivoRecusa && (
          <div><dt className="inline font-medium">Motivo da recusa: </dt><dd className="inline">{reserva.motivoRecusa}</dd></div>
        )}
      </dl>

      {recusando && (
        <div className="mt-3 space-y-2">
          <label className="block text-sm">Motivo da recusa
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          {erroMotivo && <p role="alert" className="text-sm text-red-600">{erroMotivo}</p>}
          <button type="button" disabled={ocupado} onClick={confirmarRecusa}
            className="rounded bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50">Confirmar recusa</button>
        </div>
      )}

      {erro && <p role="alert" className="mt-3 text-sm text-red-600">{erro}</p>}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {podeDecidir && (
          <>
            <button type="button" disabled={ocupado}
              onClick={() => void executar(aprovar.mutateAsync(reserva.id))}
              className="rounded bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50">Aprovar</button>
            {!recusando && (
              <button type="button" disabled={ocupado} onClick={() => setRecusando(true)}
                className="rounded border border-red-600 px-3 py-2 text-sm text-red-600 disabled:opacity-50">Recusar</button>
            )}
          </>
        )}
        {podeCancelar && (
          <button type="button" disabled={ocupado}
            onClick={() => void executar(cancelar.mutateAsync(reserva.id))}
            className="rounded border px-3 py-2 text-sm disabled:opacity-50">Cancelar reserva</button>
        )}
      </div>
    </Modal>
  );
}
