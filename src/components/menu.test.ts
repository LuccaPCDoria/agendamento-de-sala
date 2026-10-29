import { describe, expect, it } from 'vitest';
import { itensDoMenu } from './menu';

describe('itensDoMenu', () => {
  it('professor tem 2 itens e não vê /salas', () => {
    const itens = itensDoMenu('usuario');
    expect(itens).toHaveLength(2);
    expect(itens.map((i) => i.rota)).not.toContain('/salas');
  });
  it('admin tem 6 itens', () => {
    expect(itensDoMenu('admin')).toHaveLength(6);
  });
  it('todos os itens têm ícone e rótulos/rotas se mantêm', () => {
    const itens = itensDoMenu('admin');
    expect(itens.map((i) => i.rotulo)).toEqual(['Calendário', 'Minhas reservas', 'Aprovações', 'Salas', 'Usuários', 'Relatórios']);
    expect(itens.map((i) => i.rota)).toEqual(['/', '/reservas', '/aprovacoes', '/salas', '/usuarios', '/relatorios']);
    for (const i of itens) expect(i.icone).toBeTruthy();
  });
});
