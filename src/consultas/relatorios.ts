import { api } from '../lib/api';
import type { RelatorioMensalDTO } from '../../shared/tipos';

export function buscarRelatorioMensal(mes: string): Promise<RelatorioMensalDTO> {
  return api<RelatorioMensalDTO>('/relatorios/mensal', { query: { mes } });
}
