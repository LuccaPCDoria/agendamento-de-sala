// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { StatusReserva } from '../../shared/constantes';
import { SeloStatus } from './SeloStatus';

afterEach(cleanup);

describe('SeloStatus', () => {
  it.each([
    ['aprovada', false, 'Aprovada', /bg-primaria-suave/],
    ['pendente', false, 'Pendente', /bg-coral-suave/],
    ['recusada', false, 'Recusada', /bg-erro-suave/],
    ['cancelada', false, 'Cancelada', /bg-neutro-suave/],
    ['pendente', true, 'Expirada', /border-dashed/],
  ])('%s (expirada=%s) mostra %s', (status, expirada, texto, classe) => {
    render(<SeloStatus status={status as StatusReserva} expirada={expirada as boolean} />);
    expect(screen.getByText(texto as string).className).toMatch(classe as RegExp);
  });
});
