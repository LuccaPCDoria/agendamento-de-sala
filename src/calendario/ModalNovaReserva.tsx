import { useRef, useState, type FormEvent } from 'react';
import { DURACAO_MINIMA_MIN, FINALIDADE_MAX, HORA_ABERTURA, HORA_FECHAMENTO } from '../../shared/constantes';
import { esquemaCriarReserva } from '../../shared/esquemas';
import type { Sala } from '../../shared/tipos';
import Modal from '../components/Modal';
import { useCriarReserva } from '../consultas/reservas';
import { ErroApi } from '../lib/api';
import { Botao } from '../ui/Botao';
import { Campo } from '../ui/Campo';
import { Selecao } from '../ui/Selecao';

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

  return (
    <Modal titulo="Nova reserva" aoFechar={aoFechar}>
      <form onSubmit={enviar} noValidate className="space-y-3">
        {!salaFixa && (
          <Selecao rotulo="Sala" value={salaId} onChange={(e) => setSalaId(e.target.value)} erro={erros.salaId}>
            <option value="">Selecione...</option>
            {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </Selecao>
        )}
        <Campo rotulo="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <div className="flex gap-3">
          <div className="flex-1">
            <Campo rotulo="Início" type="time" value={horaIni} min={HORA_ABERTURA} max={HORA_FECHAMENTO}
              step={DURACAO_MINIMA_MIN * 60} onChange={(e) => setHoraIni(e.target.value)} className="font-numero" />
          </div>
          <div className="flex-1">
            <Campo rotulo="Fim" type="time" value={horaFim} min={HORA_ABERTURA} max={HORA_FECHAMENTO}
              step={DURACAO_MINIMA_MIN * 60} onChange={(e) => setHoraFim(e.target.value)} className="font-numero" />
          </div>
        </div>
        {erros.inicio && <p role="alert" className="text-sm text-erro">{erros.inicio}</p>}
        {erros.fim && <p role="alert" className="text-sm text-erro">{erros.fim}</p>}
        <Campo rotulo="Finalidade" value={finalidade} maxLength={FINALIDADE_MAX}
          onChange={(e) => setFinalidade(e.target.value)} erro={erros.finalidade} />
        {erroApi && <p role="alert" className="text-sm text-erro">{erroApi}</p>}
        <Botao type="submit" carregando={criar.isPending} textoCarregando="Enviando..." className="w-full">
          Confirmar
        </Botao>
      </form>
    </Modal>
  );
}
