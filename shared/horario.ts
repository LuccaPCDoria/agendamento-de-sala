import { formatInTimeZone } from 'date-fns-tz';
import {
  DIAS_FUNCIONAMENTO, DURACAO_MINIMA_MIN, FUSO, HORA_ABERTURA, HORA_FECHAMENTO,
} from './constantes';

/** Devolve a primeira mensagem de erro encontrada, ou null se a janela é válida. */
export function validarJanelaReserva(inicio: Date, fim: Date, agora: Date): string | null {
  if (fim.getTime() <= inicio.getTime()) return 'O horário de término deve ser depois do início.';
  if (inicio.getTime() <= agora.getTime()) return 'Não é possível reservar no passado.';

  const diaInicio = formatInTimeZone(inicio, FUSO, 'yyyy-MM-dd');
  const diaFim = formatInTimeZone(fim, FUSO, 'yyyy-MM-dd');
  if (diaInicio !== diaFim) return 'A reserva deve começar e terminar no mesmo dia.';

  // 'i' = dia ISO (1 = segunda ... 7 = domingo); DIAS_FUNCIONAMENTO usa 0 = domingo
  const diaSemana = Number(formatInTimeZone(inicio, FUSO, 'i')) % 7;
  if (!DIAS_FUNCIONAMENTO.includes(diaSemana)) return 'Reservas só podem ser feitas de segunda a sábado.';

  const horaInicio = formatInTimeZone(inicio, FUSO, 'HH:mm');
  const horaFim = formatInTimeZone(fim, FUSO, 'HH:mm');
  if (horaInicio < HORA_ABERTURA || horaFim > HORA_FECHAMENTO) {
    return `Reservas só podem ser feitas entre ${HORA_ABERTURA} e ${HORA_FECHAMENTO}.`;
  }

  if ((fim.getTime() - inicio.getTime()) / 60000 < DURACAO_MINIMA_MIN) {
    return `A reserva deve ter pelo menos ${DURACAO_MINIMA_MIN} minutos.`;
  }
  return null;
}
