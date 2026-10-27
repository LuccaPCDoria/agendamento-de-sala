import type { DependenciasApp } from '../dependencias';
import type { Perfil, Sala } from '../../shared/tipos';
import type { DadosSala } from '../../shared/esquemas';
import { naoEncontrado } from '../lib/erros';

export function criarServicoSalas(deps: DependenciasApp) {
  return {
    async listar(usuario: Perfil, incluirInativas: boolean): Promise<Sala[]> {
      return deps.repos.salas.listar(usuario.papel === 'admin' && incluirInativas);
    },
    async criar(d: DadosSala): Promise<Sala> {
      return deps.repos.salas.inserir(d);
    },
    async editar(id: string, d: Partial<DadosSala>): Promise<Sala> {
      const sala = await deps.repos.salas.atualizar(id, d);
      if (!sala) throw naoEncontrado('Sala não encontrada.');
      return sala;
    },
  };
}
