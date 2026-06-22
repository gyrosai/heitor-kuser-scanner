import { ReactNode } from 'react';
import clsx from 'clsx';

interface BadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  leftIcon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<BadgeProps['variant'], string> = {
  success: 'text-success-fg',
  warning: 'text-warning-fg',
  danger: 'text-danger-fg',
  info: 'text-info-fg',
  neutral: 'text-text-muted',
};

export function Badge({ variant, leftIcon, children }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-xs font-semibold',
        variantClasses[variant]
      )}
    >
      {leftIcon}
      {children}
    </span>
  );
}
