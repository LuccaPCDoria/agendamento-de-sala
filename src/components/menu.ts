import { BadgeCheck, CalendarDays, DoorOpen, FileText, ListChecks, Users, type LucideIcon } from 'lucide-react';
import type { Papel } from '../../shared/constantes';

export interface ItemMenu { rota: string; rotulo: string; icone: LucideIcon }

const comuns: ItemMenu[] = [
  { rota: '/', rotulo: 'Calendário', icone: CalendarDays },
  { rota: '/reservas', rotulo: 'Minhas reservas', icone: ListChecks },
];
const admin: ItemMenu[] = [
  { rota: '/aprovacoes', rotulo: 'Aprovações', icone: BadgeCheck },
  { rota: '/salas', rotulo: 'Salas', icone: DoorOpen },
  { rota: '/usuarios', rotulo: 'Usuários', icone: Users },
  { rota: '/relatorios', rotulo: 'Relatórios', icone: FileText },
];

export function itensDoMenu(papel: Papel): ItemMenu[] {
  return papel === 'admin' ? [...comuns, ...admin] : [...comuns];
}
