import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DadosSala } from '../../shared/esquemas';
import type { Sala } from '../../shared/tipos';
import { api } from '../lib/api';

export function useSalas(incluirInativas = false) {
  return useQuery({
    queryKey: ['salas', { incluirInativas }],
    queryFn: () =>
      api<Sala[]>('/salas', { query: incluirInativas ? { incluirInativas: 'true' } : undefined }),
  });
}

export function useCriarSala() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: DadosSala) => api<Sala>('/salas', { metodo: 'POST', corpo: dados }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salas'] }),
  });
}

export function useEditarSala() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: DadosSala }) =>
      api<Sala>(`/salas/${id}`, { metodo: 'PATCH', corpo: dados }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salas'] }),
  });
}

function alternarSala(acao: 'inativar' | 'reativar') {
  return function useAlternar() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => api<Sala>(`/salas/${id}/${acao}`, { metodo: 'POST' }),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['reservas'] });
        void qc.invalidateQueries({ queryKey: ['pendentes'] });
        return qc.invalidateQueries({ queryKey: ['salas'] });
      },
    });
  };
}
export const useInativarSala = alternarSala('inativar');
export const useReativarSala = alternarSala('reativar');
