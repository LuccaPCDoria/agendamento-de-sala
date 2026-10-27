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
});
