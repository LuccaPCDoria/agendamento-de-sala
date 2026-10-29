import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

export const classesCampo =
  'w-full rounded-xl border border-borda-campo bg-superficie-2 px-3 py-2 font-texto text-texto placeholder:text-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 focus-visible:ring-offset-superficie';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
  rotuloOculto?: boolean;
  erro?: string | null;
};

export function Campo({ rotulo, rotuloOculto, erro, className = '', id, ...resto }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={idCampo} className={`font-texto text-sm font-medium text-texto ${rotuloOculto ? 'sr-only' : ''}`.trim()}>
        {rotulo}
      </label>
      <input id={idCampo} {...resto} className={`${classesCampo} ${className}`.trim()} />
      {erro && (
        <p role="alert" className="text-sm text-erro">
          {erro}
        </p>
      )}
    </div>
  );
}
