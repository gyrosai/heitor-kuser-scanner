import { ChevronRight, LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface CaptureCardProps {
  variant: 'primary' | 'secondary' | 'tertiary';
  icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: number;
  onClick: () => void;
}

const styles = {
  primary: {
    card: 'bg-laranja-360 border-laranja-360 shadow-primary-strong',
    iconBox: 'bg-white/[18%]',
    icon: 'text-white',
    title: 'text-white',
    subtitle: 'text-white/80',
    chevron: 'text-white/70',
  },
  secondary: {
    card: 'bg-white border-border-default',
    iconBox: 'bg-tint-laranja-bg',
    icon: 'text-laranja-360',
    title: 'text-azul-noturno',
    subtitle: 'text-text-muted',
    chevron: 'text-border-strong',
  },
  tertiary: {
    card: 'bg-surface-muted border-border-default',
    iconBox: 'bg-white',
    icon: 'text-text-muted',
    title: 'text-azul-noturno',
    subtitle: 'text-text-muted',
    chevron: 'text-border-strong',
  },
} as const;

export function CaptureCard({ variant, icon: Icon, title, subtitle, badge, onClick }: CaptureCardProps) {
  const s = styles[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-[14px] rounded-2xl border p-[14px] text-left active:scale-[0.98] transition-transform',
        s.card,
      )}
    >
      <div className={clsx('w-11 h-11 rounded-lg flex items-center justify-center shrink-0', s.iconBox)}>
        <Icon size={22} strokeWidth={1.9} className={s.icon} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={clsx('text-[15px] font-bold leading-[1.2] tracking-[-0.1px]', s.title)}>{title}</p>
        <p className={clsx('text-[12px] mt-0.5 leading-[1.4]', s.subtitle)}>{subtitle}</p>
      </div>

      {badge != null && badge > 0 && (
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 text-sm font-bold text-laranja-360">
          {badge}
        </span>
      )}

      <ChevronRight size={18} strokeWidth={2} className={s.chevron} />
    </button>
  );
}
