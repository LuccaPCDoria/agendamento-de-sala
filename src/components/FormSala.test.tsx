// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FormSala from './FormSala';

afterEach(cleanup);

describe('FormSala', () => {
  it('mostra a mensagem do esquema e não salva com nome em branco', async () => {
    const aoSalvar = vi.fn();
    render(<FormSala aoSalvar={aoSalvar} />);
    await userEvent.type(screen.getByLabelText('Nome'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('Informe o nome da sala.')).toBeTruthy();
    expect(aoSalvar).not.toHaveBeenCalled();
  });

  it('envia dados válidos com recursos separados por vírgula', async () => {
    const aoSalvar = vi.fn();
    render(<FormSala aoSalvar={aoSalvar} />);
    await userEvent.type(screen.getByLabelText('Nome'), 'Sala 1');
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'reuniao');
    await userEvent.clear(screen.getByLabelText('Capacidade'));
    await userEvent.type(screen.getByLabelText('Capacidade'), '10');
    await userEvent.type(screen.getByLabelText('Recursos (separados por vírgula)'), 'projetor, ar-condicionado');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(aoSalvar).toHaveBeenCalledWith({
      nome: 'Sala 1', tipo: 'reuniao', capacidade: 10, recursos: ['projetor', 'ar-condicionado'],
    });
  });
});
