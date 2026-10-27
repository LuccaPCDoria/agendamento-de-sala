import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { StatusFiltro, TipoSala } from '../../shared/constantes';
import type { DadosCriarReserva } from '../../shared/esquemas';
import type { ReservaDTO } from '../../shared/tipos';
import { api } from '../lib/api';

export interface FiltroBuscaReservas {
  inicio: string;
  fim: string;
  salaId?: string;
  tipo?: TipoSala;
  status?: StatusFiltro[];
  minhas?: boolean;
}

export function buscarReservas(f: FiltroBuscaReservas): Promise<ReservaDTO[]> {
  return api<ReservaDTO[]>('/reservas', {
    query: {
      inicio: f.inicio,
      fim: f.fim,
      salaId: f.salaId || undefined,
      tipo: f.tipo,
      status: f.status?.length ? f.status.join(',') : undefined,
      minhas: f.minhas ? 'true' : undefined,
    },
  });
}

export function useCriarReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: DadosCriarReserva) => api<ReservaDTO>('/reservas', { metodo: 'POST', corpo: dados }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservas'] });
      void qc.invalidateQueries({ queryKey: ['pendentes'] });
    },
  });
}
