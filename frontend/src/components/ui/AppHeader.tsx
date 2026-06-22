import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export function AppHeader({ title, subtitle, onBack, rightAction }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-border-default h-[54px] flex items-center px-1">
      <div className="w-11 flex items-center justify-start shrink-0">
        {onBack && (
          <button
            type="button"
            aria-label="Voltar"
            onClick={onBack}
            className="flex items-center justify-center w-11 h-11 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja-360 focus-visible:ring-offset-2"
          >
            <ChevronLeft size={22} strokeWidth={2.2} className="text-azul-noturno" />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-w-0">
        <p className="text-base font-bold text-azul-noturno tracking-tight truncate">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs font-semibold text-text-muted">{subtitle}</p>
        )}
      </div>

      <div className="w-11 flex items-center justify-end shrink-0">
        {rightAction}
      </div>
    </header>
  );
}
