import type { DependenciasApp } from '../dependencias';
import type { RelatorioMensalDTO } from '../../shared/tipos';
import type { StatusFiltro } from '../../shared/constantes';
import { limitesDoMes } from '../lib/datas';
import { paraReservaDTO } from '../lib/dto';

export function criarServicoRelatorios(deps: DependenciasApp) {
  return {
    async mensal(mes: string): Promise<RelatorioMensalDTO> {
      const { inicio, fim } = limitesDoMes(mes);
      const agora = deps.agora();
      const lista = await deps.repos.reservas.listarPeriodo(inicio, fim);
      const reservas = lista.map((r) => paraReservaDTO(r, agora));
      const totais: Record<StatusFiltro, number> = { pendente: 0, expirada: 0, aprovada: 0, recusada: 0, cancelada: 0 };
      for (const r of reservas) totais[r.expirada ? 'expirada' : r.status]++;
      return { mes, reservas, totais };
    },
  };
}
