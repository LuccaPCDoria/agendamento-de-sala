// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Botao } from './Botao';
import { Campo } from './Campo';
import { Selecao } from './Selecao';

afterEach(cleanup);

describe('Botao', () => {
  it('principal tem as classes de token e de anel de foco', () => {
    const b = render(<Botao>Ok</Botao>).getByRole('button');
    expect(b.className).toMatch(/bg-primaria-botao/);
    expect(b.className).toMatch(/focus-visible:ring-primaria/);
    expect(b).toHaveProperty('type', 'button');
  });
  it('carregando fica desabilitado e mostra textoCarregando', () => {
    render(<Botao carregando textoCarregando="Salvando...">Salvar</Botao>);
    const b = screen.getByRole('button', { name: 'Salvando...' });
    expect(b).toHaveProperty('disabled', true);
  });
  it('carregando sem textoCarregando mostra o conteúdo', () => {
    render(<Botao carregando>Salvar</Botao>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveProperty('disabled', true);
  });
  it('disabled={true} e carregando={false} fica desabilitado', () => {
    render(<Botao disabled carregando={false}>Ok</Botao>);
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });
});

describe('Campo', () => {
  it('liga rótulo ao input e mostra erro com role=alert', () => {
    render(<Campo rotulo="E-mail" erro="Inválido" />);
    const input = screen.getByLabelText('E-mail');
    expect(input.tagName).toBe('INPUT');
    expect(screen.getByRole('alert').textContent).toBe('Inválido');
  });
  it('sem erro não há alert', () => {
    render(<Campo rotulo="E-mail" />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('Selecao', () => {
  it('com rotuloOculto continua acessível e o rótulo tem sr-only', () => {
    render(<Selecao rotulo="Filtrar por sala" rotuloOculto><option>A</option></Selecao>);
    expect(screen.getByLabelText('Filtrar por sala').tagName).toBe('SELECT');
    expect(screen.getByText('Filtrar por sala').className).toMatch(/sr-only/);
  });
});
