import { ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

interface BannerProps {
  variant: 'success' | 'warning' | 'danger' | 'info';
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variantClasses: Record<BannerProps['variant'], { wrapper: string; iconRing: string; title: string }> = {
  success: {
    wrapper: 'bg-success-bg border-success-border',
    iconRing: 'border-success-border',
    title: 'text-success-fg',
  },
  warning: {
    wrapper: 'bg-warning-bg border-warning-border',
    iconRing: 'border-warning-border',
    title: 'text-warning-fg',
  },
  danger: {
    wrapper: 'bg-danger-bg border-danger-border',
    iconRing: 'border-danger-border',
    title: 'text-danger-fg',
  },
  info: {
    wrapper: 'bg-info-bg border-info-border',
    iconRing: 'border-info-border',
    title: 'text-info-fg',
  },
};

export function Banner({
  variant,
  icon,
  title,
  description,
  actions,
  dismissible = false,
  onDismiss,
}: BannerProps) {
  const styles = variantClasses[variant];

  return (
    <div
      className={clsx(
        'relative rounded-xl border p-[14px] flex gap-3',
        styles.wrapper
      )}
    >
      {icon && (
        <span
          className={clsx(
            'flex items-center justify-center w-8 h-8 rounded-full bg-white border shrink-0',
            styles.iconRing
          )}
        >
          {icon}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <p className={clsx('font-bold text-sm', styles.title)}>{title}</p>
        {description && (
          <p className="text-sm text-text-default mt-0.5">{description}</p>
        )}
        {actions && <div className="mt-2">{actions}</div>}
      </div>

      {dismissible && (
        <button
          type="button"
          aria-label="Fechar"
          onClick={onDismiss}
          className={clsx(
            'flex items-center justify-center w-6 h-6 rounded-full shrink-0',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja-360 focus-visible:ring-offset-1',
            styles.title
          )}
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
