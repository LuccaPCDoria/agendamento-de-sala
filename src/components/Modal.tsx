import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props { titulo: string; aoFechar: () => void; children: ReactNode }

export default function Modal({ titulo, aoFechar, children }: Props) {
  const idTitulo = useId();
  const ref = useRef<HTMLDivElement>(null);
  const fecharRef = useRef(aoFechar);
  fecharRef.current = aoFechar;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input,select,button')?.focus();
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharRef.current(); };
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      anterior?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={idTitulo}
        className="w-full max-w-md rounded bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 id={idTitulo} className="text-lg font-semibold">{titulo}</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="text-slate-500">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
