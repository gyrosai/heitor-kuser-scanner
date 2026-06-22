"use client";

import { Lock, Check } from "lucide-react";
import GoogleLogo from "@/components/GoogleLogo";

interface OAuthExpiredScreenProps {
  onReconnect: () => void;
  pendingCount?: number;
}

export function OAuthExpiredScreen({
  onReconnect,
  pendingCount = 0,
}: OAuthExpiredScreenProps) {
  return (
    <div className="fixed inset-0 bg-azul-noturno overflow-y-auto">
      <div className="relative min-h-full pt-10 px-7 pb-8 flex flex-col justify-center gap-6">

        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-laranja-360/18 border border-laranja-360/40 flex-shrink-0">
          <Lock size={26} strokeWidth={2} className="text-laranja-360" />
        </div>

        {/* Copy */}
        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-laranja-360">
            SESSÃO EXPIRADA.
          </div>
          <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-tight">
            Reconecte sua conta Google
          </h1>
          <p className="text-[13px] text-white/65 leading-relaxed">
            Por segurança, sua autenticação foi encerrada. Faça login novamente
            para continuar capturando e enviando o Mídia Kit.
          </p>
        </div>

        {/* Reassurance card — só quando há capturas pendentes */}
        {pendingCount > 0 && (
          <div className="bg-white/8 border border-white/12 rounded-xl p-3.5 flex items-start gap-2.5">
            <Check size={16} strokeWidth={2.5} className="text-laranja-360 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[12px] font-bold text-white mb-0.5">
                Suas capturas estão salvas
              </div>
              <div className="text-[11px] text-white/60 leading-relaxed">
                {pendingCount} cartões aguardam processamento. Nada será perdido
                com o novo login.
              </div>
            </div>
          </div>
        )}

        {/* Reconnect button */}
        <button
          type="button"
          onClick={onReconnect}
          className="w-full flex items-center justify-center gap-3 rounded-xl min-h-[52px] px-4 font-semibold text-[15px] bg-white text-azul-noturno border border-azul-noturno active:bg-app-bg transition-colors"
        >
          <GoogleLogo />
          <span>Conectar com Google</span>
        </button>
      </div>
    </div>
  );
}
