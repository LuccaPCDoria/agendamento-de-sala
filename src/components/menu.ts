import type { Papel } from '../../shared/constantes';

export interface ItemMenu { rota: string; rotulo: string }

const comuns: ItemMenu[] = [
  { rota: '/', rotulo: 'Calendário' },
  { rota: '/reservas', rotulo: 'Minhas reservas' },
];
const admin: ItemMenu[] = [
  { rota: '/aprovacoes', rotulo: 'Aprovações' },
  { rota: '/salas', rotulo: 'Salas' },
  { rota: '/usuarios', rotulo: 'Usuários' },
  { rota: '/relatorios', rotulo: 'Relatórios' },
];

export function itensDoMenu(papel: Papel): ItemMenu[] {
  return papel === 'admin' ? [...comuns, ...admin] : [...comuns];
}
