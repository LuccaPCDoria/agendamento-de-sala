import { X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60"
      onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={idTitulo}
        className="w-full max-w-md rounded-2xl bg-superficie p-6 font-texto text-texto shadow-modal dark:border dark:shadow-none">
        <div className="mb-4 flex items-center justify-between">
          <h2 id={idTitulo} className="font-titulo text-lg font-semibold">{titulo}</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-suave hover:bg-superficie-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 focus-visible:ring-offset-superficie">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
