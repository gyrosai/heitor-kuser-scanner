"use client";

import { useState } from "react";
import { Shield, ChevronDown, ChevronUp } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import GoogleLogo from "@/components/GoogleLogo";

interface LoginScreenProps {
  onLogin: () => void;
  loading?: boolean;
}

export function LoginScreen({ onLogin, loading = false }: LoginScreenProps) {
  const [permsExpanded, setPermsExpanded] = useState(false);

  return (
    <div className="fixed inset-0 bg-azul-noturno overflow-y-auto">
      <div className="relative min-h-full pt-8 px-7 pb-8 flex flex-col">
        {/* geometric accent */}
        <div className="absolute top-[90px] right-[-40px] w-[100px] h-[3px] bg-laranja-360 rotate-[-45deg] opacity-50 pointer-events-none" />

        {/* hero content */}
        <div className="flex-1 flex flex-col justify-center gap-5 pt-10 pb-8">
          {/* Logo mock */}
          <div className="flex items-center gap-2">
            <svg width="32" height="20" viewBox="0 0 32 20" aria-hidden>
              <circle cx="8" cy="10" r="8" fill="#FA6800" opacity="0.9" />
              <circle cx="22" cy="10" r="8" fill="#FA6800" opacity="0.5" />
            </svg>
            <span className="text-[18px] font-extrabold text-white tracking-[-2.5px]">
              cimi360
            </span>
          </div>

          {/* Wordmark */}
          <div className="flex items-baseline gap-1">
            <span className="text-[20px] font-extrabold text-laranja-360 leading-none">
              cimi
            </span>
            <span className="text-[17px] font-bold text-white leading-none tracking-[1.2px]">
              LEADS
            </span>
          </div>

          {/* Pillar label */}
          <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-laranja-360">
            BOAS-VINDAS.
          </div>

          <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-tight">
            Capture contatos profissionais do ecossistema CIMI360
          </h1>

          <p className="text-[13px] text-white/65 leading-relaxed">
            Foto de cartão, QR Code, captura em sequência. Sincronizado com seu
            Google Contacts.
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-white rounded-2xl p-4 shadow-2xl">
          {/* Google login button */}
          <button
            type="button"
            onClick={onLogin}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 rounded-xl min-h-[52px] px-4 font-semibold text-[15px] transition-colors ${
              loading
                ? "bg-app-bg text-text-muted border border-border-default"
                : "bg-white text-azul-noturno border border-azul-noturno active:bg-app-bg"
            }`}
          >
            {loading ? (
              <>
                <Spinner size={18} />
                <span>Conectando ao Google...</span>
              </>
            ) : (
              <>
                <GoogleLogo />
                <span>Continuar com Google</span>
              </>
            )}
          </button>

          {/* Disclaimer */}
          <div className="mt-3 flex items-start gap-2">
            <Shield
              size={13}
              strokeWidth={2}
              className="text-text-subtle mt-0.5 shrink-0"
            />
            <p className="text-[11px] text-text-subtle leading-relaxed">
              Acesso pode ser revogado a qualquer momento nas configurações da
              sua conta Google.
            </p>
          </div>

          {/* Collapsible permissions */}
          <button
            type="button"
            onClick={() => setPermsExpanded((v) => !v)}
            className="mt-3 w-full flex items-center justify-between py-2 text-[12px] font-semibold text-text-muted"
          >
            <span>Detalhes das permissões</span>
            {permsExpanded ? (
              <ChevronUp size={15} strokeWidth={2} />
            ) : (
              <ChevronDown size={15} strokeWidth={2} />
            )}
          </button>

          {permsExpanded && (
            <div className="mt-1 flex flex-col gap-3 pt-2 border-t border-border-default">
              {[
                {
                  scope: "gmail.send",
                  title: "Gmail",
                  desc: "Enviar o Mídia Kit em seu nome para os contatos que você capturar.",
                },
                {
                  scope: "contacts",
                  title: "Google Contacts",
                  desc: "Salvar contatos capturados no seu Google Contacts.",
                },
                {
                  scope: "openid profile",
                  title: "Perfil",
                  desc: "Identificar você no app — nome e foto.",
                },
              ].map(({ scope, title, desc }) => (
                <div key={scope}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-[12px] font-semibold text-text-default">
                      {title}
                    </p>
                    <code className="text-[10px] font-mono bg-app-bg px-1.5 py-0.5 rounded text-text-muted">
                      {scope}
                    </code>
                  </div>
                  <p className="text-[11px] text-text-subtle leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Gyros */}
        <div className="mt-6 text-center">
          <div className="w-7 h-px bg-white/18 mx-auto mb-3" />
          <p className="text-[9px] font-medium text-white/45 tracking-[1.4px] uppercase mb-1">
            DESENVOLVIDO POR
          </p>
          <p className="text-[12px] font-bold text-white/75">
            Gyros AI Solutions
          </p>
        </div>
      </div>
    </div>
  );
}
