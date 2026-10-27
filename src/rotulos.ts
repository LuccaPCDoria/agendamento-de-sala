import type { Papel, TipoSala } from '../shared/constantes';

export const ROTULO_TIPO: Record<TipoSala, string> = {
  reuniao: 'Reunião',
  biblioteca: 'Biblioteca',
  laboratorio: 'Laboratório',
};

export const ROTULO_PAPEL: Record<Papel, string> = {
  usuario: 'Professor',
  admin: 'Direção',
};
