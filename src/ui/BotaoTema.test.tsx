// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

beforeEach(() => {
  document.documentElement.className = '';
  localStorage.clear();
  vi.resetModules();
});
afterEach(cleanup);

async function montar(ui: (B: React.ComponentType) => React.ReactElement) {
  const { iniciarTema } = await import('../tema/tema');
  const { BotaoTema } = await import('./BotaoTema');
  iniciarTema();
  return render(ui(BotaoTema));
}

describe('BotaoTema', () => {
  it('aria-label conforme o tema e clique alterna', async () => {
    await montar((B) => <B />);
    const botao = screen.getByRole('button', { name: 'Ativar modo escuro' });
    expect(botao).toHaveAttribute('type', 'button');
    await userEvent.click(botao);
    expect(screen.getByRole('button', { name: 'Ativar modo claro' })).toBeInTheDocument();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('dois BotaoTema montados ficam sincronizados', async () => {
    await montar((B) => (
      <>
        <B />
        <B />
      </>
    ));
    await userEvent.click(screen.getAllByRole('button')[0]);
    const botoes = screen.getAllByRole('button', { name: 'Ativar modo claro' });
    expect(botoes).toHaveLength(2);
  });
});
