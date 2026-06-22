import { forwardRef, InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  warning?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, required, warning, error, helperText, disabled, className, id, ...rest },
  ref
) {
  const hasWarning = !!warning && !error;
  const hasError = !!error;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-text-muted">
          {label}
          {required && <span className="text-laranja-360 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        disabled={disabled}
        className={clsx(
          'h-12 w-full rounded-lg border px-3.5 py-3 text-lg font-medium text-text-default bg-white',
          'placeholder:text-text-subtle',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
          !hasWarning && !hasError && [
            'border-border-default',
            'focus-visible:border-azul-noturno focus-visible:ring-azul-noturno/20',
          ],
          hasWarning && 'border-warning-border focus-visible:ring-warning-border/30',
          hasError && 'border-danger-border focus-visible:ring-danger-border/30',
          disabled && 'opacity-50 cursor-not-allowed bg-surface-muted',
          className
        )}
        {...rest}
      />
      {hasWarning && (
        <p className="flex items-center gap-1 text-xs text-warning-fg">
          <AlertTriangle size={12} />
          {warning}
        </p>
      )}
      {hasError && (
        <p className="flex items-center gap-1 text-xs text-danger-fg">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
      {!hasWarning && !hasError && helperText && (
        <p className="text-xs text-text-subtle">{helperText}</p>
      )}
    </div>
  );
});
