type Props = { tamanho?: number; comNome?: boolean; variante?: 'padrao' | 'branca'; className?: string };

const CORES = {
  padrao: {
    quadrado: 'rgb(var(--cor-primaria))',
    calendario: 'rgb(var(--cor-superficie))',
    topo: 'rgb(var(--cor-coral))',
    check: 'rgb(var(--cor-primaria))',
  },
  branca: { quadrado: '#FFFFFF', calendario: '#E6F4F1', topo: 'rgb(var(--cor-coral))', check: '#0B7A6E' },
};

export function Logo({ tamanho = 40, comNome = false, variante = 'padrao', className = '' }: Props) {
  const c = CORES[variante];
  const svg = (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      {...(comNome ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'Agendamento de Salas' })}
      className={comNome ? undefined : className || undefined}
    >
      <rect width="40" height="40" rx="12" fill={c.quadrado} />
      <rect x="9" y="11" width="22" height="20" rx="4" fill={c.calendario} />
      <rect x="9" y="11" width="22" height="6" rx="3" fill={c.topo} />
      <path d="M14 8v6M26 8v6" stroke={c.calendario} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M15 24l3.5 3.5L25 21" stroke={c.check} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (!comNome) return svg;
  const corTexto = variante === 'branca' ? 'text-primaria-botao-texto' : 'text-texto';
  const corLinha2 = variante === 'branca' ? 'text-primaria-botao-texto' : 'text-primaria-forte';
  return (
    <span className={`inline-flex items-center gap-3 ${className}`.trim()}>
      {svg}
      <span className="flex flex-col font-titulo text-sm font-extrabold leading-tight">
        <span className={corTexto}>Agendamento</span>
        <span className={corLinha2}>de Salas</span>
      </span>
    </span>
  );
}
