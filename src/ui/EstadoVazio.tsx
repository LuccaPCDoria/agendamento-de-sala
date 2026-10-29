import type { LucideIcon } from 'lucide-react';

export function EstadoVazio({ icone: Icone, mensagem }: { icone: LucideIcon; mensagem: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-suave">
      <Icone className="h-10 w-10 text-primaria" aria-hidden="true" />
      <p>{mensagem}</p>
    </div>
  );
}
