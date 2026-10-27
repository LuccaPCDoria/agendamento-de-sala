export interface Periodo { inicio: Date; fim: Date }

export function mesCorrente(ref = new Date()): Periodo {
  return {
    inicio: new Date(ref.getFullYear(), ref.getMonth(), 1),
    fim: new Date(ref.getFullYear(), ref.getMonth() + 1, 1),
  };
}

interface Props { valor: Periodo; aoMudar: (p: Periodo) => void }

export default function SeletorPeriodo({ valor, aoMudar }: Props) {
  const deslocar = (n: number) =>
    aoMudar(mesCorrente(new Date(valor.inicio.getFullYear(), valor.inicio.getMonth() + n, 1)));
  const titulo = valor.inicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => deslocar(-1)} className="rounded border px-3 py-1">Mês anterior</button>
      <span className="min-w-32 text-center capitalize">{titulo}</span>
      <button type="button" onClick={() => deslocar(1)} className="rounded border px-3 py-1">Próximo mês</button>
    </div>
  );
}
