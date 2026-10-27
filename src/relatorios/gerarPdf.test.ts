import { describe, expect, it } from 'vitest';
import { gerarPdfMensal } from './gerarPdf';
import type { RelatorioMensalDTO } from '../../shared/tipos';

const dados: RelatorioMensalDTO = {
  mes: '2026-11',
  totais: { pendente: 0, expirada: 0, aprovada: 1, recusada: 0, cancelada: 0 },
  reservas: [{
    id: '1', salaId: 's', salaNome: 'Sala de reuniões', salaTipo: 'reuniao', usuarioId: 'u', solicitanteNome: 'João Conceição',
    inicio: '2026-11-03T12:00:00Z', fim: '2026-11-03T13:00:00Z', status: 'aprovada', finalidade: 'Reunião pedagógica',
    motivoRecusa: null, expirada: false,
  }],
};

describe('gerarPdfMensal', () => {
  it('produz documento com 1+ páginas sem lançar', () => {
    expect(gerarPdfMensal(dados).getNumberOfPages()).toBeGreaterThan(0);
  });
  it('funciona sem reservas', () => {
    expect(gerarPdfMensal({ ...dados, reservas: [] }).getNumberOfPages()).toBeGreaterThan(0);
  });
});
