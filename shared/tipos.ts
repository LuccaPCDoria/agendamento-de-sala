import type { Papel, StatusFiltro, StatusReserva, TipoSala } from './constantes';

export interface Perfil { id: string; nome: string; email: string; papel: Papel; ativo: boolean }

export interface Sala {
  id: string; nome: string; tipo: TipoSala; capacidade: number; recursos: string[]; ativa: boolean;
}

export interface ReservaDTO {
  id: string; salaId: string; salaNome: string; salaTipo: TipoSala; usuarioId: string;
  solicitanteNome: string; inicio: string; fim: string; status: StatusReserva; finalidade: string;
  motivoRecusa: string | null; expirada: boolean;
}

export interface EntradaHistoricoDTO {
  statusAnterior: StatusReserva | null; statusNovo: StatusReserva; alteradoPorNome: string; alteradoEm: string;
}

export interface RelatorioMensalDTO {
  mes: string; reservas: ReservaDTO[]; totais: Record<StatusFiltro, number>;
}
