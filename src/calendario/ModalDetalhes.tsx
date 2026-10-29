import { useState } from 'react';
import { esquemaRecusar } from '../../shared/esquemas';
import type { Perfil, ReservaDTO } from '../../shared/tipos';
import Modal from '../components/Modal';
import { useAprovar, useCancelar, useHistorico, useRecusar } from '../consultas/reservas';
import { formatarDataHora, ROTULO_STATUS } from '../rotulos';
import { Botao } from '../ui/Botao';
import { classesCampo } from '../ui/Campo';
import { Hora } from '../ui/Hora';
import { SeloStatus } from '../ui/SeloStatus';

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
  const ativa = (reserva.status === 'pendente' || reserva.status === 'aprovada') && !reserva.expirada
    && new Date(reserva.inicio).getTime() > Date.now();
  const podeCancelar = ativa && (admin || reserva.usuarioId === perfil.id);
  const podeDecidir = admin && reserva.status === 'pendente' && ativa;
  const ocupado = aprovar.isPending || recusar.isPending || cancelar.isPending;
  const erro = aprovar.error?.message ?? recusar.error?.message ?? cancelar.error?.message ?? null;
  const verHistorico = admin || reserva.usuarioId === perfil.id;
  const historico = useHistorico(reserva.id, verHistorico);

  async function executar(p: Promise<unknown>) {
    try { await p; aoFechar(); } catch { /* erro exibido no modal */ }
  }

  function confirmarCancelamento() {
    if (!window.confirm('Cancelar esta reserva? O solicitante será avisado por e-mail.')) return;
    void executar(cancelar.mutateAsync(reserva.id));
  }

  function confirmarRecusa() {
    const r = esquemaRecusar.safeParse({ motivo });
    if (!r.success) { setErroMotivo(r.error.issues[0].message); return; }
    setErroMotivo(null);
    void executar(recusar.mutateAsync({ id: reserva.id, motivo: r.data.motivo }));
  }

  return (
    <Modal titulo="Detalhes da reserva" aoFechar={aoFechar}>
      <dl className="space-y-1 text-sm text-texto">
        <div><dt className="inline font-bold">Sala: </dt><dd className="inline">{reserva.salaNome}</dd></div>
        <div><dt className="inline font-bold">Horário: </dt>
          <dd className="inline"><Hora>{formatarPeriodo(reserva.inicio, reserva.fim)}</Hora></dd></div>
        <div><dt className="inline font-bold">Solicitante: </dt><dd className="inline">{reserva.solicitanteNome}</dd></div>
        <div><dt className="inline font-bold">Finalidade: </dt><dd className="inline break-words">{reserva.finalidade}</dd></div>
        <div><dt className="inline font-bold">Status: </dt>
          <dd className="inline"><SeloStatus status={reserva.status} expirada={reserva.expirada} /></dd></div>
        {reserva.motivoRecusa && (
          <div className="text-erro-forte"><dt className="inline font-bold">Motivo da recusa: </dt><dd className="inline break-words">{reserva.motivoRecusa}</dd></div>
        )}
      </dl>

      {verHistorico && historico.data && historico.data.length > 0 && (
        <section className="mt-3">
          <h3 className="text-sm font-bold text-texto">Histórico</h3>
          <ul className="mt-1 space-y-1 text-xs text-suave">
            {historico.data.map((e, i) => (
              <li key={i} className="font-numero">
                {formatarDataHora(e.alteradoEm)} — {e.statusAnterior ? ROTULO_STATUS[e.statusAnterior] : 'Criada'} →{' '}
                {ROTULO_STATUS[e.statusNovo]} — por {e.alteradoPorNome}
              </li>
            ))}
          </ul>
        </section>
      )}

      {recusando && (
        <div className="mt-3 space-y-2">
          <label className="block text-sm font-medium text-texto">Motivo da recusa
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className={`mt-1 ${classesCampo}`} />
          </label>
          {erroMotivo && <p role="alert" className="text-sm text-erro-forte">{erroMotivo}</p>}
          <Botao variante="perigo" disabled={ocupado} onClick={confirmarRecusa}>Confirmar recusa</Botao>
        </div>
      )}

      {erro && <p role="alert" className="mt-3 text-sm text-erro-forte">{erro}</p>}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {podeDecidir && (
          <>
            <Botao disabled={ocupado} onClick={() => void executar(aprovar.mutateAsync(reserva.id))}>Aprovar</Botao>
            {!recusando && (
              <Botao variante="secundario" disabled={ocupado} onClick={() => setRecusando(true)}>Recusar</Botao>
            )}
          </>
        )}
        {podeCancelar && (
          <Botao variante="secundario" disabled={ocupado} onClick={confirmarCancelamento}>Cancelar reserva</Botao>
        )}
      </div>
    </Modal>
  );
}
