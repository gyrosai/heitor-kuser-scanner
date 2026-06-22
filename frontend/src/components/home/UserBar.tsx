import { Mail, LogOut, Info } from 'lucide-react';
import type { EmailQuota } from '@/lib/api';

interface UserBarProps {
  userName: string;
  quota: EmailQuota | null;
  onLogout: () => void;
  onAbout?: () => void;
}

function initials(name: string): string {
  const parts = name.split(' ').filter((p) => p.length > 1);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function UserBar({ userName, quota, onLogout, onAbout }: UserBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white">
      <div className="w-[38px] h-[38px] rounded-full bg-azul-noturno text-white flex items-center justify-center text-[13px] font-bold shrink-0 tracking-[0.5px]">
        {initials(userName)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-azul-noturno leading-[1.2]">{userName}</p>
        {quota && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
            <Mail size={11} strokeWidth={2.2} />
            <span>{quota.used} / {quota.limit} enviados hoje</span>
          </p>
        )}
      </div>

      {/* TODO: considerar migrar pra menu de usuário (sheet com Sobre + Sair) em viewports muito pequenos */}
      {onAbout && (
        <button
          type="button"
          onClick={onAbout}
          aria-label="Sobre o app"
          className="h-9 w-9 flex items-center justify-center rounded-md text-text-muted hover:text-azul-noturno hover:bg-app-bg"
        >
          <Info size={18} strokeWidth={2} />
        </button>
      )}

      <button
        type="button"
        onClick={onLogout}
        aria-label="Sair"
        className="flex items-center gap-1 bg-transparent border-0 p-2 cursor-pointer text-[12px] font-semibold text-text-muted"
      >
        <LogOut size={15} strokeWidth={2} />
        <span>Sair</span>
      </button>
    </div>
  );
}
