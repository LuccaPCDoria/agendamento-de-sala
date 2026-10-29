import { formatInTimeZone } from 'date-fns-tz';
import { FUSO, type Papel, type TipoSala } from '../../shared/constantes';
import type { Perfil, ReservaDTO, Sala } from '../../shared/tipos';

export type Situacao = '' | 'ativo' | 'inativo';

/** de/ate no formato yyyy-MM-dd (input type="date"), comparados com a data no fuso do sistema. */
export interface FiltroPendentes { busca: string; salaId: string; tipo: TipoSala | ''; de: string; ate: string }
export interface FiltroSalas { busca: string; tipo: TipoSala | ''; situacao: Situacao; capacidadeMin: string }
export interface FiltroUsuarios { busca: string; papel: Papel | ''; situacao: Situacao }

export const FILTRO_PENDENTES_VAZIO: FiltroPendentes = { busca: '', salaId: '', tipo: '', de: '', ate: '' };
export const FILTRO_SALAS_VAZIO: FiltroSalas = { busca: '', tipo: '', situacao: '', capacidadeMin: '' };
export const FILTRO_USUARIOS_VAZIO: FiltroUsuarios = { busca: '', papel: '', situacao: '' };

/** Minúsculas e sem acentos, para busca tolerante. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function contem(termo: string, ...campos: string[]): boolean {
  const t = normalizar(termo);
  return !t || campos.some((c) => normalizar(c).includes(t));
}

function confereSituacao(situacao: Situacao, ativo: boolean): boolean {
  return !situacao || (situacao === 'ativo') === ativo;
}

export function filtroAtivo(f: object): boolean {
  return Object.values(f).some((v) => typeof v === 'string' && v.trim() !== '');
}

export function filtrarPendentes(reservas: ReservaDTO[], f: FiltroPendentes): ReservaDTO[] {
  return reservas.filter((r) => {
    if (!contem(f.busca, r.solicitanteNome, r.finalidade)) return false;
    if (f.salaId && r.salaId !== f.salaId) return false;
    if (f.tipo && r.salaTipo !== f.tipo) return false;
    if (f.de || f.ate) {
      const dia = formatInTimeZone(r.inicio, FUSO, 'yyyy-MM-dd');
      if (f.de && dia < f.de) return false;
      if (f.ate && dia > f.ate) return false;
    }
    return true;
  });
}

export function filtrarSalas(salas: Sala[], f: FiltroSalas): Sala[] {
  const minimo = Number.parseInt(f.capacidadeMin, 10);
  return salas.filter((s) =>
    contem(f.busca, s.nome, ...s.recursos)
    && (!f.tipo || s.tipo === f.tipo)
    && confereSituacao(f.situacao, s.ativa)
    && (Number.isNaN(minimo) || s.capacidade >= minimo));
}

export function filtrarUsuarios(usuarios: Perfil[], f: FiltroUsuarios): Perfil[] {
  return usuarios.filter((u) =>
    contem(f.busca, u.nome, u.email)
    && (!f.papel || u.papel === f.papel)
    && confereSituacao(f.situacao, u.ativo));
}
