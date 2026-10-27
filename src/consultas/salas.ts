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
