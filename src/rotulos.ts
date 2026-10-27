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

export const ROTULO_STATUS: Record<string, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
};

export const CONFIRMA_INATIVAR =
  'As reservas futuras serão canceladas e os solicitantes avisados por e-mail. Continuar?';

const dois = (n: number) => String(n).padStart(2, '0');

export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}
