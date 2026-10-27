import { useCallback, useRef, useState } from 'react';
import type { EventInput } from '@fullcalendar/core';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBr from '@fullcalendar/core/locales/pt-br';
import { DIAS_FUNCIONAMENTO, HORA_ABERTURA, HORA_FECHAMENTO } from '../../shared/constantes';
import { reservaParaEvento } from '../calendario/eventos';
import ModalNovaReserva from '../calendario/ModalNovaReserva';
import { buscarReservas } from '../consultas/reservas';
import { useSalas } from '../consultas/salas';

interface Selecao { inicio?: Date; fim?: Date }

export default function Calendario() {
  const calendarRef = useRef<FullCalendar>(null);
  const { data: salas = [] } = useSalas();
  const [salaId, setSalaId] = useState('');
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const salaIdRef = useRef(salaId);

  const visaoInicial = window.matchMedia?.('(max-width: 640px)').matches ? 'listWeek' : 'timeGridWeek';

  const buscarEventos = useCallback(
    (info: { startStr: string; endStr: string }, ok: (e: EventInput[]) => void, falha: (e: Error) => void) => {
      buscarReservas({ inicio: info.startStr, fim: info.endStr, salaId: salaIdRef.current || undefined })
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

  function fechar() {
    setSelecao(null);
    const api = calendarRef.current?.getApi();
    api?.unselect();
    api?.refetchEvents();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Calendário</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm">
            <span className="sr-only">Filtrar por sala</span>
            <select value={salaId} onChange={(e) => alterarSala(e.target.value)} className="rounded border px-3 py-2">
              <option value="">Todas as salas</option>
              {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setSelecao({})}
            className="rounded bg-blue-600 px-3 py-2 text-white">Nova reserva</button>
        </div>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        locale={ptBr}
        timeZone="local"
        initialView={visaoInicial}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
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
        select={(info) => {
          if (info.view.type === 'dayGridMonth') {
            info.view.calendar.unselect();
            return;
          }
          setSelecao({ inicio: info.start, fim: info.end });
        }}
      />

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
