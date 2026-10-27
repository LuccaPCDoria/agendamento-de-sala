import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DadosCriarUsuario, DadosEditarUsuario } from '../../shared/esquemas';
import type { Perfil } from '../../shared/tipos';
import { api } from '../lib/api';

export function useUsuarios() {
  return useQuery({ queryKey: ['usuarios'], queryFn: () => api<Perfil[]>('/usuarios') });
}

export function useCriarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: DadosCriarUsuario) => api<Perfil>('/usuarios', { metodo: 'POST', corpo: dados }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useEditarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: DadosEditarUsuario }) =>
      api<Perfil>(`/usuarios/${id}`, { metodo: 'PATCH', corpo: dados }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}
