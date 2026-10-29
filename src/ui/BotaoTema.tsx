import { Moon, Sun } from 'lucide-react';
import { useTema } from '../tema/useTema';

const FOCO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 focus-visible:ring-offset-superficie';

export function BotaoTema({ className = '' }: { className?: string }) {
  const { tema, alternar } = useTema();
  const escuro = tema === 'escuro';
  const Icone = escuro ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-suave hover:bg-superficie-2 ${FOCO} ${className}`.trim()}
    >
      <Icone className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
