import { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  padding?: 'sm' | 'md' | 'lg';
  elevated?: boolean;
  borderColor?: string;
  children: ReactNode;
  className?: string;
}

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({ padding = 'md', elevated = false, borderColor, children, className }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-border-default',
        paddingClasses[padding],
        elevated && 'shadow-md',
        className
      )}
      style={borderColor ? { borderColor } : undefined}
    >
      {children}
    </div>
  );
}
