export const FUSO = 'America/Sao_Paulo';
export const HORA_ABERTURA = '07:00';
export const HORA_FECHAMENTO = '23:00';
/** 0 = domingo */
export const DIAS_FUNCIONAMENTO = [1, 2, 3, 4, 5, 6];
export const DURACAO_MINIMA_MIN = 15;
export const JANELA_MAXIMA_DIAS = 62;
export const FINALIDADE_MAX = 200;

export const PAPEIS = ['usuario', 'admin'] as const;
export const TIPOS_SALA = ['reuniao', 'biblioteca', 'laboratorio'] as const;
export const STATUS_RESERVA = ['pendente', 'aprovada', 'recusada', 'cancelada'] as const;
export const STATUS_FILTRO = [...STATUS_RESERVA, 'expirada'] as const;

export type Papel = (typeof PAPEIS)[number];
export type TipoSala = (typeof TIPOS_SALA)[number];
export type StatusReserva = (typeof STATUS_RESERVA)[number];
export type StatusFiltro = StatusReserva | 'expirada';
