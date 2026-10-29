import { useId } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { classesCampo } from './Campo';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  rotulo: string;
  rotuloOculto?: boolean;
  erro?: string | null;
  children: ReactNode;
};

export function Selecao({ rotulo, rotuloOculto, erro, className = '', id, children, ...resto }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={idCampo} className={`font-texto text-sm font-medium text-texto ${rotuloOculto ? 'sr-only' : ''}`.trim()}>
        {rotulo}
      </label>
      <select id={idCampo} {...resto} className={`${classesCampo} ${className}`.trim()}>
        {children}
      </select>
      {erro && (
        <p role="alert" className="text-sm text-erro">
          {erro}
        </p>
      )}
    </div>
  );
}
