import { fromZonedTime } from 'date-fns-tz';
import { FUSO } from '../../shared/constantes';

/** Meia-noite (Brasília) do dia 1 de `mes` (AAAA-MM) até o dia 1 do mês seguinte. */
export function limitesDoMes(mes: string): { inicio: Date; fim: Date } {
  const [ano, m] = mes.split('-').map(Number);
  const proxAno = m === 12 ? ano + 1 : ano;
  const proxMes = m === 12 ? 1 : m + 1;
  const dois = (n: number) => String(n).padStart(2, '0');
  return {
    inicio: fromZonedTime(`${ano}-${dois(m)}-01T00:00:00`, FUSO),
    fim: fromZonedTime(`${proxAno}-${dois(proxMes)}-01T00:00:00`, FUSO),
  };
}
