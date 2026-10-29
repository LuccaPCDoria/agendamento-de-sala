import type { ReactNode } from 'react';

export function Titulo({ children, subtitulo, acao }: { children: ReactNode; subtitulo?: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-titulo text-xl font-extrabold text-texto">{children}</h1>
        {subtitulo && <p className="mt-1 text-sm text-suave">{subtitulo}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  );
}
