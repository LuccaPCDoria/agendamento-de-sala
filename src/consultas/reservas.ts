import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StatusFiltro, TipoSala } from '../../shared/constantes';
import type { DadosCriarReserva } from '../../shared/esquemas';
import type { EntradaHistoricoDTO, ReservaDTO } from '../../shared/tipos';
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

function invalidar(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['reservas'] });
  void qc.invalidateQueries({ queryKey: ['pendentes'] });
  void qc.invalidateQueries({ queryKey: ['historico'] });
}

export function usePendentes() {
  return useQuery({ queryKey: ['pendentes'], queryFn: () => api<ReservaDTO[]>('/reservas/pendentes') });
}

export function useReservasPeriodo(filtro: FiltroBuscaReservas) {
  return useQuery({
    queryKey: ['reservas', filtro],
    queryFn: () => buscarReservas(filtro),
  });
}

export function useHistorico(id: string, habilitado: boolean) {
  return useQuery({
    queryKey: ['historico', id],
    queryFn: () => api<EntradaHistoricoDTO[]>(`/reservas/${id}/historico`),
    enabled: habilitado,
  });
}

export function useAprovar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<ReservaDTO>(`/reservas/${id}/aprovar`, { metodo: 'POST' }),
    onSuccess: () => invalidar(qc),
  });
}

export function useRecusar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      api<ReservaDTO>(`/reservas/${id}/recusar`, { metodo: 'POST', corpo: { motivo } }),
    onSuccess: () => invalidar(qc),
  });
}

export function useCancelar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<ReservaDTO>(`/reservas/${id}/cancelar`, { metodo: 'POST' }),
    onSuccess: () => invalidar(qc),
  });
}
