import clsx from 'clsx';
import { Check } from 'lucide-react';
import { RadioGroup } from './Radio';

interface ClassificationCardProps {
  label: string;
  color: string;
  active: boolean;
  onToggle: () => void;
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export function ClassificationCard({
  label,
  color,
  active,
  onToggle,
  options,
  selected,
  onSelect,
  disabled,
}: ClassificationCardProps) {
  const radioOptions = options.map((o) => ({ value: o.toLowerCase(), label: o }));

  return (
    <div
      className={clsx(
        'bg-white rounded-xl transition-all',
        active ? 'border-2' : 'border border-border-default'
      )}
      style={active ? { borderColor: color } : undefined}
    >
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        className={clsx(
          'w-full flex items-center gap-3 p-4',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja-360 focus-visible:ring-offset-2 rounded-xl',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={clsx(
            'flex items-center justify-center w-[22px] h-[22px] rounded-md shrink-0 transition-colors',
            active ? '' : 'border-[1.5px] border-border-strong bg-white'
          )}
          style={active ? { backgroundColor: color } : undefined}
        >
          {active && <Check size={14} strokeWidth={3} className="text-white" />}
        </span>
        <span className="font-bold text-sm text-azul-noturno">{label}</span>
      </button>

      {active && (
        <div className="px-4 pb-4">
          <RadioGroup
            name={label}
            value={selected}
            onChange={onSelect}
            options={radioOptions}
            color={color}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
