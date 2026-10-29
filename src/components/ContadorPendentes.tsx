import { usePendentes } from '../consultas/reservas';

export default function ContadorPendentes() {
  const { data } = usePendentes();
  const total = data?.length ?? 0;
  if (total === 0) return null;
  return (
    <>
      <span aria-hidden="true" className="ml-auto rounded-full bg-coral px-2 py-0.5 font-numero text-xs font-bold text-coral-texto">{total}</span>
      <span className="sr-only">{total} pendentes</span>
    </>
  );
}
