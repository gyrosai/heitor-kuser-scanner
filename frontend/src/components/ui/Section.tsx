import { ReactNode } from 'react';
import clsx from 'clsx';

interface SectionProps {
  title: string;
  children: ReactNode;
  noPadding?: boolean;
}

export function Section({ title, children, noPadding = false }: SectionProps) {
  return (
    <div className={clsx(!noPadding && 'px-5 py-2')}>
      <p className="text-[10px] font-bold uppercase tracking-[1.4px] text-azul-noturno mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}
