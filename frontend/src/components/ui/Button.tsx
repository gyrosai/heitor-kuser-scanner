import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-laranja-360 text-white shadow-primary hover:brightness-110 active:scale-[0.98]',
  secondary: 'bg-white text-azul-noturno border border-border-default hover:bg-app-bg',
  ghost: 'bg-transparent text-azul-noturno hover:bg-app-bg',
  destructive: 'bg-transparent text-danger-fg hover:bg-danger-bg',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-12 px-4 text-base font-bold',
  lg: 'h-14 px-6 text-lg font-bold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    type = 'button',
    children,
    className,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja-360 focus-visible:ring-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
