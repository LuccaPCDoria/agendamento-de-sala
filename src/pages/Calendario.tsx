import { useCallback, useRef, useState } from 'react';
import type { EventContentArg, EventInput } from '@fullcalendar/core';
import { Check, Clock, History, Plus } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBr from '@fullcalendar/core/locales/pt-br';
import {
  DIAS_FUNCIONAMENTO, HORA_ABERTURA, HORA_FECHAMENTO, TIPOS_SALA,
  type StatusFiltro, type TipoSala,
} from '../../shared/constantes';
import { classeDoEvento, reservaParaEvento } from '../calendario/eventos';
import ModalDetalhes from '../calendario/ModalDetalhes';
import ModalNovaReserva from '../calendario/ModalNovaReserva';
import type { ReservaDTO } from '../../shared/tipos';
import { useAuth } from '../auth/AuthProvider';
import { buscarReservas } from '../consultas/reservas';
import { useSalas } from '../consultas/salas';
import { ROTULO_STATUS, ROTULO_TIPO } from '../rotulos';
import { Botao } from '../ui/Botao';
import { Cartao } from '../ui/Cartao';
import { Hora } from '../ui/Hora';
import { Selecao as CampoSelecao } from '../ui/Selecao';
import { Titulo } from '../ui/Titulo';

const STATUS_CALENDARIO: StatusFiltro[] = ['pendente', 'aprovada', 'expirada'];

interface Selecao { inicio?: Date; fim?: Date }

const ICONE_EVENTO = { 'evento-aprovada': Check, 'evento-pendente': Clock, 'evento-expirada': History };

function conteudoEvento(arg: EventContentArg) {
  const reserva = arg.event.extendedProps.reserva as ReservaDTO;
  const Icone = ICONE_EVENTO[classeDoEvento(reserva)];
  const icone = <Icone size={12} aria-hidden="true" className="shrink-0" />;
  const tipoVisao = arg.view.type;
  if (tipoVisao === 'dayGridMonth') {
    return (
      <div className="flex min-w-0 items-center gap-1">
        <span className="fc-daygrid-event-dot" />
        {icone}
        <Hora className="font-bold">{arg.timeText}</Hora>
        <span className="truncate">{arg.event.title}</span>
      </div>
    );
  }
  if (tipoVisao === 'listWeek') {
    return (
      <span className="inline-flex items-center gap-1">
        {icone}
        <span>{arg.event.title}</span>
      </span>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-1">
      {icone}
      <Hora className="font-bold">{arg.timeText}</Hora>
      <span className="truncate">{arg.event.title}</span>
    </div>
  );
}

const AMOSTRA: Record<string, string> = {
  pendente: 'border border-coral-forte bg-coral',
  aprovada: 'bg-evento-aprovada',
  expirada: 'border border-dashed border-neutro-forte bg-evento-expirada',
};

export default function Calendario() {
  const calendarRef = useRef<FullCalendar>(null);
  const { data: salas = [] } = useSalas();
  const [salaId, setSalaId] = useState('');
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const { perfil } = useAuth();
  const [detalhe, setDetalhe] = useState<ReservaDTO | null>(null);
  const [tipo, setTipo] = useState<TipoSala | ''>('');
  const [status, setStatus] = useState<StatusFiltro[]>(STATUS_CALENDARIO);
  const salaIdRef = useRef(salaId);
  const tipoRef = useRef<TipoSala | ''>('');
  const statusRef = useRef<StatusFiltro[]>(STATUS_CALENDARIO);

  const [estreita] = useState(() => !!window.matchMedia?.('(max-width: 640px)').matches);
  const visaoInicial = estreita ? 'listWeek' : 'timeGridWeek';
  const cabecalho = estreita
    ? { left: 'prev,next', center: 'title', right: 'today' }
    : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' };
  const rodape = estreita ? { center: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' } : undefined;

  const buscarEventos = useCallback(
    (info: { startStr: string; endStr: string }, ok: (e: EventInput[]) => void, falha: (e: Error) => void) => {
      buscarReservas({
        inicio: info.startStr, fim: info.endStr, salaId: salaIdRef.current || undefined,
        tipo: tipoRef.current || undefined, status: statusRef.current,
      })
        .then((rs) => ok(rs.map(reservaParaEvento)))
        .catch(falha);
    },
    [],
  );

  function alterarSala(id: string) {
    setSalaId(id);
    salaIdRef.current = id;
    calendarRef.current?.getApi().refetchEvents();
  }

  function alterarTipo(t: TipoSala | '') {
    setTipo(t);
    tipoRef.current = t;
    calendarRef.current?.getApi().refetchEvents();
  }

  function alternarStatus(st: StatusFiltro) {
    const novo = STATUS_CALENDARIO.filter((x) => (x === st ? !status.includes(x) : status.includes(x)));
    if (novo.length === 0) return;
    setStatus(novo);
    statusRef.current = novo;
    calendarRef.current?.getApi().refetchEvents();
  }

  function fechar() {
    setSelecao(null);
    const api = calendarRef.current?.getApi();
    api?.unselect();
    api?.refetchEvents();
  }

  function fecharDetalhe() {
    setDetalhe(null);
    calendarRef.current?.getApi().refetchEvents();
  }

  return (
    <div>
      <Titulo
        subtitulo="Veja a ocupação e reserve em poucos cliques"
        acao={<Botao variante="principal" icone={<Plus size={16} aria-hidden="true" />} onClick={() => setSelecao({})}>Nova reserva</Botao>}
      >
        Calendário
      </Titulo>

      <Cartao className="mb-4 flex flex-wrap items-end gap-3 p-4">
        <CampoSelecao rotulo="Filtrar por sala" rotuloOculto value={salaId} onChange={(e) => alterarSala(e.target.value)}>
          <option value="">Todas as salas</option>
          {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </CampoSelecao>
        <CampoSelecao rotulo="Filtrar por tipo" rotuloOculto value={tipo} onChange={(e) => alterarTipo(e.target.value as TipoSala | '')}>
          <option value="">Todas</option>
          {TIPOS_SALA.map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
        </CampoSelecao>
        <fieldset className="flex flex-wrap items-center gap-4 pb-2 text-sm text-texto">
          <legend className="sr-only">Filtrar por status</legend>
          {STATUS_CALENDARIO.map((st) => (
            <label key={st} className="flex items-center gap-2">
              <input type="checkbox" checked={status.includes(st)} onChange={() => alternarStatus(st)}
                className="h-4 w-4 accent-primaria-botao focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 focus-visible:ring-offset-superficie" />
              <span aria-hidden="true" data-amostra={st} className={`inline-block h-3 w-3 rounded-sm ${AMOSTRA[st]}`} />
              {ROTULO_STATUS[st]}
            </label>
          ))}
        </fieldset>
      </Cartao>

      <Cartao className="p-2 sm:p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        locale={ptBr}
        timeZone="local"
        initialView={visaoInicial}
        headerToolbar={cabecalho}
        footerToolbar={rodape}
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        businessHours={{ daysOfWeek: DIAS_FUNCIONAMENTO, startTime: HORA_ABERTURA, endTime: HORA_FECHAMENTO }}
        selectConstraint="businessHours"
        selectable
        height="auto"
        events={buscarEventos}
        allDaySlot={false}
        dateClick={(info) => {
          if (info.view.type === 'dayGridMonth') info.view.calendar.changeView('timeGridDay', info.date);
        }}
        eventContent={conteudoEvento}
        eventDidMount={(info) => {
          const r = info.event.extendedProps.reserva as ReservaDTO;
          info.el.title = `${ROTULO_STATUS[r.expirada ? 'expirada' : r.status]} · ${info.event.title}`;
        }}
        eventClick={(info) => setDetalhe(info.event.extendedProps.reserva as ReservaDTO)}
        select={(info) => {
          if (info.view.type === 'dayGridMonth') {
            info.view.calendar.unselect();
            return;
          }
          setSelecao({ inicio: info.start, fim: info.end });
        }}
      />
      </Cartao>

      {detalhe && perfil && <ModalDetalhes reserva={detalhe} perfil={perfil} aoFechar={fecharDetalhe} />}

      {selecao && (
        <ModalNovaReserva
          aberto
          inicial={{ ...selecao, salaId: salaId || undefined }}
          salas={salas}
          aoFechar={fechar}
        />
      )}
    </div>
  );
}
