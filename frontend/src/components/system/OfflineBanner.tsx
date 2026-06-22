"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { useNetworkStatus } from "@/providers/NetworkProvider";

interface OfflineBannerProps {
  pendingCount?: number;
}

export function OfflineBanner({ pendingCount = 0 }: OfflineBannerProps) {
  const { online } = useNetworkStatus();

  if (online) return null;

  const handleRetry = () => {
    fetch("/api/health", { method: "HEAD", cache: "no-store" }).catch(() => {});
  };

  return (
    <div className="sticky top-0 z-50 bg-warning-bg border-b border-warning-border px-4 py-2.5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-white border border-warning-border flex items-center justify-center flex-shrink-0">
        <WifiOff size={14} strokeWidth={2.2} className="text-warning-fg" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-warning-fg">Sem conexão</div>
        <div className="text-[11px] text-text-default leading-tight">
          {pendingCount > 0
            ? `${pendingCount} capturas em fila local · serão sincronizadas quando voltar`
            : "Algumas funções podem estar indisponíveis"}
        </div>
      </div>
      <button
        onClick={handleRetry}
        className="bg-white border border-warning-border text-warning-fg rounded-md px-3 py-1.5 text-xs font-bold flex items-center gap-1 min-h-[34px] flex-shrink-0"
      >
        <RefreshCw size={11} strokeWidth={2.4} />
        Tentar
      </button>
    </div>
  );
}
