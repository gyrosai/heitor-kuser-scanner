import clsx from 'clsx';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const roundedClasses: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Skeleton({ width = '100%', height = 16, rounded = 'md' }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden bg-app-bg border border-border-default',
        roundedClasses[rounded]
      )}
      style={{ width, height }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_1.6s_ease-in-out_infinite]" />
    </div>
  );
}
