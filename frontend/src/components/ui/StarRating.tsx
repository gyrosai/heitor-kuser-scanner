import clsx from 'clsx';
import { Star } from 'lucide-react';
import { colors } from '@/lib/tokens';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
}

export function StarRating({ value, onChange, max = 3, disabled }: StarRatingProps) {
  return (
    <div role="group" aria-label="Importância" className="flex items-center gap-3">
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = i < value;

        return (
          <button
            key={i}
            type="button"
            aria-label={`${starValue} de ${max} estrelas`}
            aria-pressed={filled}
            disabled={disabled}
            onClick={() => onChange(value === starValue ? 0 : starValue)}
            className={clsx(
              'flex items-center justify-center w-11 h-11',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja-360 focus-visible:ring-offset-1 rounded-full',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Star
              size={34}
              strokeWidth={1.6}
              style={{
                fill: filled ? colors.brand.laranja360 : 'none',
                stroke: filled ? colors.brand.laranja360 : colors.neutral.borderStrong,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
