import type { Perfil, ReservaDTO } from '../shared/tipos';

export interface Reserva
  extends Omit<ReservaDTO, 'salaNome' | 'salaTipo' | 'solicitanteNome' | 'expirada' | 'inicio' | 'fim'> {
  inicio: Date;
  fim: Date;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ReservaDetalhada extends Reserva {
  salaNome: ReservaDTO['salaNome'];
  salaTipo: ReservaDTO['salaTipo'];
  solicitanteNome: string;
  solicitanteEmail: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: Perfil;
    }
  }
}
