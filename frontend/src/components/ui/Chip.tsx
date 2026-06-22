import { ReactNode } from 'react';
import clsx from 'clsx';

interface ChipProps {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'classification';
  children: ReactNode;
}

export function Chip({ active, onClick, disabled, variant = 'default', children }: ChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center justify-center h-9 px-3.5 rounded-full text-sm font-semibold transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja-360 focus-visible:ring-offset-2',
        variant === 'default' && (
          active
            ? 'bg-azul-noturno text-white border border-azul-noturno'
            : 'bg-white text-azul-noturno border border-border-default'
        ),
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}
