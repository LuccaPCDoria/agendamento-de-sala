import { describe, it, expect } from 'vitest';
import {
  esquemaCriarReserva, esquemaCriarUsuario, esquemaSala, esquemaRecusar,
  esquemaListarReservas, esquemaMes, esquemaEditarSala,
} from '../../shared/esquemas';

const UUID = '123e4567-e89b-42d3-a456-426614174000';
const I = '2026-11-03T10:00:00-03:00';
const F = '2026-11-03T11:00:00-03:00';

describe('esquemas', () => {
  it('finalidade só com espaços é rejeitada', () => expect(esquemaCriarReserva.safeParse({ salaId: UUID, inicio: I, fim: F, finalidade: '   ' }).success).toBe(false));
  it('data sem offset é rejeitada com mensagem', () => {
    const r = esquemaCriarReserva.safeParse({ salaId: UUID, inicio: '2026-11-03T10:00', fim: F, finalidade: 'Aula' });
    expect(r.success).toBe(false); expect(r.error!.issues[0].message).toBe('Data e hora inválidas.');
  });
  it('normaliza e-mail', () => expect(esquemaCriarUsuario.parse({ nome: 'Ana', email: '  Ana@X.COM ', senha: '12345678', papel: 'usuario' }).email).toBe('ana@x.com'));
  it('nome de sala só com espaços é rejeitado', () => expect(esquemaSala.safeParse({ nome: ' ', tipo: 'reuniao', capacidade: 10, recursos: [] }).success).toBe(false));
  it('motivo de recusa só com espaços é rejeitado', () => expect(esquemaRecusar.safeParse({ motivo: '  ' }).success).toBe(false));
  it('listagem: status em lista e minhas', () => expect(esquemaListarReservas.parse({ inicio: I, fim: F, status: 'recusada,cancelada', minhas: 'true' })).toMatchObject({ status: ['recusada', 'cancelada'], minhas: true }));
  it('listagem: janela acima de 62 dias rejeitada', () => expect(esquemaListarReservas.safeParse({ inicio: '2026-11-01T00:00:00Z', fim: '2027-01-03T00:00:00Z' }).success).toBe(false));
  it('mês 2026-13 rejeitado', () => expect(esquemaMes.safeParse('2026-13').success).toBe(false));
  it('editar sala não aceita ativa (removido pelo parse)', () => {
    const r = esquemaEditarSala.parse({ ativa: false });
    expect(r).not.toHaveProperty('ativa');
  });
});
