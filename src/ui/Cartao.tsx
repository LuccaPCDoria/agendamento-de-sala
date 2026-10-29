import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'li' };

export function Cartao({ as: Tag = 'div', className = '', ...resto }: Props) {
  return (
    <Tag
      {...resto}
      className={`rounded-2xl border bg-superficie shadow-cartao dark:shadow-none ${className}`.trim()}
    />
  );
}
