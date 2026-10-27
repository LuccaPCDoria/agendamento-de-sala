import type { ReservaDetalhada } from '../tipos';

export type TipoEmail = 'criada' | 'confirmada' | 'aprovada' | 'recusada' | 'cancelada';

export interface EventoEmail {
  para: string;
  nome: string;
  tipo: TipoEmail;
  reservas: ReservaDetalhada[];
}

/** Nunca rejeita. */
export type Notificador = (eventos: EventoEmail[]) => Promise<void>;

export const notificadorNulo: Notificador = async () => {};
