export function SeloSituacao({ ativo, rotulos }: { ativo: boolean; rotulos: [string, string] }) {
  const cor = ativo ? 'bg-primaria-suave text-primaria-forte' : 'bg-neutro-suave text-neutro-forte';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${cor}`}>
      {ativo ? rotulos[0] : rotulos[1]}
    </span>
  );
}
