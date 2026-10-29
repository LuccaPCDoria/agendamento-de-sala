// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import SeletorPeriodo, { mesCorrente } from './SeletorPeriodo';

afterEach(cleanup);

describe('SeletorPeriodo', () => {
  it('capitaliza só a primeira letra do mês', () => {
    render(<SeletorPeriodo valor={mesCorrente(new Date(2026, 9, 15))} aoMudar={() => {}} />);
    expect(screen.getByText('Outubro de 2026')).toBeInTheDocument();
  });
  it('mantém os nomes acessíveis dos botões', () => {
    render(<SeletorPeriodo valor={mesCorrente(new Date(2026, 9, 15))} aoMudar={() => {}} />);
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeInTheDocument();
  });
});
