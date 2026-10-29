import type { ReactNode } from 'react';

export function Hora({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-numero ${className}`.trim()}>{children}</span>;
}
