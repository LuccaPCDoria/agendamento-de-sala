import { describe, expect, it } from 'vitest';
import type { Perfil, ReservaDTO, Sala } from '../../shared/tipos';
import {
  FILTRO_PENDENTES_VAZIO, FILTRO_SALAS_VAZIO, FILTRO_USUARIOS_VAZIO,
  filtrarPendentes, filtrarSalas, filtrarUsuarios, filtroAtivo,
} from './filtrar';

const reserva = (r: Partial<ReservaDTO>): ReservaDTO => ({
  id: 'r', salaId: 's1', salaNome: 'Sala 1', salaTipo: 'reuniao', usuarioId: 'u', solicitanteNome: 'Fulano',
  inicio: '2026-11-10T13:00:00.000Z', fim: '2026-11-10T14:00:00.000Z', status: 'pendente',
  finalidade: 'Reunião', motivoRecusa: null, expirada: false, ...r,
});

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('filtrarPendentes', () => {
  const rs = [
    reserva({ id: 'a', solicitanteNome: 'João Ribeiro', finalidade: 'Aula prática', salaId: 's1', salaTipo: 'laboratorio' }),
    reserva({ id: 'b', solicitanteNome: 'Ana Souza', finalidade: 'Conselho de Classe', salaId: 's2', salaTipo: 'reuniao' }),
    // 23h30 de 11/11 em São Paulo = 02:30Z de 12/11
    reserva({ id: 'c', solicitanteNome: 'Carla', finalidade: 'Leitura', salaId: 's3', salaTipo: 'biblioteca',
      inicio: '2026-11-12T02:30:00.000Z', fim: '2026-11-12T02:45:00.000Z' }),
  ];

  it('sem filtros devolve tudo', () => {
    expect(ids(filtrarPendentes(rs, FILTRO_PENDENTES_VAZIO))).toEqual(['a', 'b', 'c']);
  });

  it('busca no solicitante ignorando acentos e maiúsculas', () => {
    expect(ids(filtrarPendentes(rs, { ...FILTRO_PENDENTES_VAZIO, busca: 'joao' }))).toEqual(['a']);
  });

  it('busca na finalidade', () => {
    expect(ids(filtrarPendentes(rs, { ...FILTRO_PENDENTES_VAZIO, busca: 'CONSELHO' }))).toEqual(['b']);
  });

  it('busca ignora espaços nas pontas', () => {
    expect(ids(filtrarPendentes(rs, { ...FILTRO_PENDENTES_VAZIO, busca: '  carla ' }))).toEqual(['c']);
  });

  it('filtra por sala', () => {
    expect(ids(filtrarPendentes(rs, { ...FILTRO_PENDENTES_VAZIO, salaId: 's2' }))).toEqual(['b']);
  });

  it('filtra por tipo', () => {
    expect(ids(filtrarPendentes(rs, { ...FILTRO_PENDENTES_VAZIO, tipo: 'biblioteca' }))).toEqual(['c']);
  });

  it('período usa a data no fuso de São Paulo, com limites inclusivos', () => {
    expect(ids(filtrarPendentes(rs, { ...FILTRO_PENDENTES_VAZIO, de: '2026-11-11', ate: '2026-11-11' }))).toEqual(['c']);
    expect(ids(filtrarPendentes(rs, { ...FILTRO_PENDENTES_VAZIO, ate: '2026-11-10' }))).toEqual(['a', 'b']);
    expect(ids(filtrarPendentes(rs, { ...FILTRO_PENDENTES_VAZIO, de: '2026-11-11' }))).toEqual(['c']);
  });

  it('combina critérios', () => {
    expect(ids(filtrarPendentes(rs, { ...FILTRO_PENDENTES_VAZIO, busca: 'a', tipo: 'reuniao' }))).toEqual(['b']);
  });
});

describe('filtrarSalas', () => {
  const sala = (s: Partial<Sala>): Sala => ({ id: 's', nome: 'Sala', tipo: 'reuniao', capacidade: 10, recursos: [], ativa: true, ...s });
  const salas = [
    sala({ id: 'a', nome: 'Auditório', capacidade: 80, recursos: ['Projetor', 'Microfone'] }),
    sala({ id: 'b', nome: 'Laboratório de Química', tipo: 'laboratorio', capacidade: 24, recursos: ['Capela'], ativa: false }),
    sala({ id: 'c', nome: 'Biblioteca', tipo: 'biblioteca', capacidade: 30, recursos: ['Computadores'] }),
  ];

  it('sem filtros devolve tudo', () => {
    expect(ids(filtrarSalas(salas, FILTRO_SALAS_VAZIO))).toEqual(['a', 'b', 'c']);
  });

  it('busca no nome ignorando acentos', () => {
    expect(ids(filtrarSalas(salas, { ...FILTRO_SALAS_VAZIO, busca: 'auditorio' }))).toEqual(['a']);
  });

  it('busca nos recursos', () => {
    expect(ids(filtrarSalas(salas, { ...FILTRO_SALAS_VAZIO, busca: 'micro' }))).toEqual(['a']);
  });

  it('filtra por tipo', () => {
    expect(ids(filtrarSalas(salas, { ...FILTRO_SALAS_VAZIO, tipo: 'laboratorio' }))).toEqual(['b']);
  });

  it('filtra por situação', () => {
    expect(ids(filtrarSalas(salas, { ...FILTRO_SALAS_VAZIO, situacao: 'inativo' }))).toEqual(['b']);
    expect(ids(filtrarSalas(salas, { ...FILTRO_SALAS_VAZIO, situacao: 'ativo' }))).toEqual(['a', 'c']);
  });

  it('capacidade mínima é inclusiva', () => {
    expect(ids(filtrarSalas(salas, { ...FILTRO_SALAS_VAZIO, capacidadeMin: '30' }))).toEqual(['a', 'c']);
  });

  it('capacidade mínima vazia ou inválida não filtra', () => {
    expect(ids(filtrarSalas(salas, { ...FILTRO_SALAS_VAZIO, capacidadeMin: 'abc' }))).toEqual(['a', 'b', 'c']);
  });
});

describe('filtrarUsuarios', () => {
  const usuario = (u: Partial<Perfil>): Perfil => ({ id: 'u', nome: 'Nome', email: 'x@x.com', papel: 'usuario', ativo: true, ...u });
  const us = [
    usuario({ id: 'a', nome: 'Natália Pereira', email: 'natalia@escola.com' }),
    usuario({ id: 'b', nome: 'Direção', email: 'direcao@escola.com', papel: 'admin' }),
    usuario({ id: 'c', nome: 'Tiago', email: 'tiago@outra.org', ativo: false }),
  ];

  it('sem filtros devolve tudo', () => {
    expect(ids(filtrarUsuarios(us, FILTRO_USUARIOS_VAZIO))).toEqual(['a', 'b', 'c']);
  });

  it('busca no nome ignorando acentos', () => {
    expect(ids(filtrarUsuarios(us, { ...FILTRO_USUARIOS_VAZIO, busca: 'NATALIA' }))).toEqual(['a']);
  });

  it('busca no e-mail', () => {
    expect(ids(filtrarUsuarios(us, { ...FILTRO_USUARIOS_VAZIO, busca: 'outra.org' }))).toEqual(['c']);
  });

  it('filtra por perfil', () => {
    expect(ids(filtrarUsuarios(us, { ...FILTRO_USUARIOS_VAZIO, papel: 'admin' }))).toEqual(['b']);
  });

  it('filtra por situação', () => {
    expect(ids(filtrarUsuarios(us, { ...FILTRO_USUARIOS_VAZIO, situacao: 'inativo' }))).toEqual(['c']);
  });
});

describe('filtroAtivo', () => {
  it('é falso para o filtro vazio e para busca só com espaços', () => {
    expect(filtroAtivo(FILTRO_USUARIOS_VAZIO)).toBe(false);
    expect(filtroAtivo({ ...FILTRO_USUARIOS_VAZIO, busca: '   ' })).toBe(false);
  });

  it('é verdadeiro com qualquer critério preenchido', () => {
    expect(filtroAtivo({ ...FILTRO_SALAS_VAZIO, capacidadeMin: '5' })).toBe(true);
  });
});
