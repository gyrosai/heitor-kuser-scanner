import clsx from 'clsx';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  labelClassName?: string;
}

export function Checkbox({ checked, onChange, disabled, label, labelClassName }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'inline-flex items-center gap-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja-360 focus-visible:ring-offset-2 rounded-md',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={clsx(
          'flex items-center justify-center w-[22px] h-[22px] rounded-md shrink-0 transition-colors',
          checked ? 'bg-laranja-360' : 'border-[1.5px] border-border-strong bg-white'
        )}
      >
        {checked && <Check size={14} strokeWidth={3} className="text-white" />}
      </span>
      {label && (
        <span className={clsx("text-sm font-semibold text-text-default", labelClassName)}>{label}</span>
      )}
    </button>
  );
}
