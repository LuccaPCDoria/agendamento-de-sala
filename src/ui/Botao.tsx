import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'principal' | 'secundario' | 'perigo' | 'discreto';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 font-texto text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 focus-visible:ring-offset-superficie';

const VARIANTES: Record<Variante, string> = {
  principal: 'bg-primaria-botao text-primaria-botao-texto hover:opacity-90',
  secundario: 'border border-borda-campo bg-transparent text-primaria-forte hover:bg-superficie-2',
  perigo: 'bg-erro text-erro-texto hover:opacity-90',
  discreto: 'bg-transparent text-suave hover:bg-superficie-2',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  carregando?: boolean;
  textoCarregando?: string;
  icone?: ReactNode;
};

export function Botao({
  variante = 'principal',
  carregando = false,
  textoCarregando,
  icone,
  type = 'button',
  disabled,
  className = '',
  children,
  ...resto
}: Props) {
  return (
    <button
      type={type}
      {...resto}
      disabled={Boolean(disabled) || carregando}
      className={`${BASE} ${VARIANTES[variante]} ${className}`.trim()}
    >
      {icone}
      {carregando ? (textoCarregando ?? children) : children}
    </button>
  );
}
