import clsx from 'clsx';
import { colors } from '@/lib/tokens';

interface RadioProps {
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  color?: string;
  disabled?: boolean;
  label: string;
}

export function Radio({
  value,
  checked,
  onChange,
  color = colors.brand.laranja360,
  disabled,
  label,
}: RadioProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(value)}
      className={clsx(
        'inline-flex items-center gap-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja-360 focus-visible:ring-offset-2 rounded-full',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className="flex items-center justify-center w-[18px] h-[18px] rounded-full shrink-0 transition-colors"
        style={{
          borderWidth: 1.5,
          borderStyle: 'solid',
          borderColor: checked ? color : colors.neutral.borderStrong,
        }}
      >
        {checked && (
          <span
            className="w-[10px] h-[10px] rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
      </span>
      <span className="text-sm text-text-default">{label}</span>
    </button>
  );
}

interface RadioGroupOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioGroupOption[];
  color?: string;
  disabled?: boolean;
}

export function RadioGroup({ name: _name, value, onChange, options, color, disabled }: RadioGroupProps) {
  return (
    <div role="radiogroup" className="flex flex-row gap-4">
      {options.map((opt) => (
        <Radio
          key={opt.value}
          value={opt.value}
          checked={value === opt.value}
          onChange={onChange}
          label={opt.label}
          color={color}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
