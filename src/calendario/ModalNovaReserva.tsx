import { useRef, useState, type FormEvent } from 'react';
import { DURACAO_MINIMA_MIN, FINALIDADE_MAX, HORA_ABERTURA, HORA_FECHAMENTO } from '../../shared/constantes';
import { esquemaCriarReserva } from '../../shared/esquemas';
import type { Sala } from '../../shared/tipos';
import Modal from '../components/Modal';
import { useCriarReserva } from '../consultas/reservas';
import { ErroApi } from '../lib/api';

interface Props {
  aberto: boolean;
  inicial: { inicio?: Date; fim?: Date; salaId?: string };
  salas: Sala[];
  aoFechar: () => void;
}

const p2 = (n: number) => String(n).padStart(2, '0');
const paraData = (d?: Date) => (d ? `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` : '');
const paraHora = (d?: Date) => (d ? `${p2(d.getHours())}:${p2(d.getMinutes())}` : '');
function montarData(data: string, hora: string): Date {
  const [a, m, d] = data.split('-').map(Number);
  const [h, mi] = hora.split(':').map(Number);
  return new Date(a, m - 1, d, h, mi);
}

export default function ModalNovaReserva({ aberto, inicial, salas, aoFechar }: Props) {
  if (!aberto) return null;
  return <Conteudo inicial={inicial} salas={salas} aoFechar={aoFechar} />;
}

function Conteudo({ inicial, salas, aoFechar }: Omit<Props, 'aberto'>) {
  const salaFixa = Boolean(inicial.salaId);
  const [salaId, setSalaId] = useState(inicial.salaId ?? '');
  const [data, setData] = useState(paraData(inicial.inicio));
  const [horaIni, setHoraIni] = useState(paraHora(inicial.inicio));
  const [horaFim, setHoraFim] = useState(paraHora(inicial.fim));
  const [finalidade, setFinalidade] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroApi, setErroApi] = useState<string | null>(null);
  const enviando = useRef(false);
  const criar = useCriarReserva();

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando.current) return;
    setErroApi(null);
    const ini = data && horaIni ? montarData(data, horaIni) : null;
    const fi = data && horaFim ? montarData(data, horaFim) : null;
    if (!ini || !fi || isNaN(ini.getTime()) || isNaN(fi.getTime())) {
      setErros({ inicio: 'Informe a data e os horários.' });
      return;
    }
    const r = esquemaCriarReserva.safeParse({
      salaId, inicio: ini.toISOString(), fim: fi.toISOString(), finalidade,
    });
    if (!r.success) {
      const novos: Record<string, string> = {};
      for (const i of r.error.issues) novos[String(i.path[0])] ??= i.message;
      setErros(novos);
      return;
    }
    setErros({});
    enviando.current = true;
    try {
      await criar.mutateAsync(r.data);
      aoFechar();
    } catch (err) {
      setErroApi(err instanceof ErroApi ? err.message : 'Erro inesperado. Tente novamente.');
    } finally {
      enviando.current = false;
    }
  }

  const campo = 'mt-1 w-full rounded border px-3 py-2';
  const msg = (k: string) => erros[k] && <span role="alert" className="block text-sm text-red-600">{erros[k]}</span>;

  return (
    <Modal titulo="Nova reserva" aoFechar={aoFechar}>
      <form onSubmit={enviar} noValidate className="space-y-3">
        {!salaFixa && (
          <label className="block text-sm">Sala
            <select value={salaId} onChange={(e) => setSalaId(e.target.value)} className={campo}>
              <option value="">Selecione...</option>
              {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            {msg('salaId')}
          </label>
        )}
        <label className="block text-sm">Data
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
        </label>
        <div className="flex gap-3">
          <label className="block flex-1 text-sm">Início
            <input type="time" value={horaIni} min={HORA_ABERTURA} max={HORA_FECHAMENTO}
              step={DURACAO_MINIMA_MIN * 60} onChange={(e) => setHoraIni(e.target.value)} className={campo} />
          </label>
          <label className="block flex-1 text-sm">Fim
            <input type="time" value={horaFim} min={HORA_ABERTURA} max={HORA_FECHAMENTO}
              step={DURACAO_MINIMA_MIN * 60} onChange={(e) => setHoraFim(e.target.value)} className={campo} />
          </label>
        </div>
        {msg('inicio')}{msg('fim')}
        <label className="block text-sm">Finalidade
          <input value={finalidade} maxLength={FINALIDADE_MAX} onChange={(e) => setFinalidade(e.target.value)} className={campo} />
          {msg('finalidade')}
        </label>
        {erroApi && <p role="alert" className="text-sm text-red-600">{erroApi}</p>}
        <button type="submit" disabled={criar.isPending}
          className="w-full rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60">
          {criar.isPending ? 'Enviando...' : 'Confirmar'}
        </button>
      </form>
    </Modal>
  );
}
