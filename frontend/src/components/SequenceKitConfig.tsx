"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { AppHeader, Banner, Card, Checkbox } from "@/components/ui";
import type { EmailQuota } from "@/lib/api";
import type { EmailLanguage } from "@/lib/types";

interface SequenceKitConfigProps {
  contactCount: number;
  emailQuota: EmailQuota | null;
  onStart: (config: { sendKit: boolean; language: EmailLanguage }) => void;
  onSkip: () => void;
  onBack: () => void;
}

const LANGUAGES: EmailLanguage[] = ["pt-BR", "en", "es"];
const LANGUAGE_LABELS: Record<EmailLanguage, string> = {
  "pt-BR": "PT",
  en: "EN",
  es: "ES",
};

export default function SequenceKitConfig({
  contactCount,
  emailQuota,
  onStart,
  onSkip,
  onBack,
}: SequenceKitConfigProps) {
  const quotaExhausted = emailQuota != null && emailQuota.remaining <= 0;

  const [sendKit, setSendKit] = useState(!quotaExhausted);
  const [language, setLanguage] = useState<EmailLanguage>("pt-BR");

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <AppHeader title="Antes de revisar" onBack={onBack} />

      <div className="flex-1 px-4 pt-8 pb-36 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-azul-noturno leading-tight">
            Pronto pra revisar{" "}
            {contactCount === 1 ? "1 contato" : `${contactCount} contatos`}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Antes de começar, configure o envio do Mídia Kit
          </p>
        </div>

        {/* Card 1 — toggle */}
        <Card padding="md">
          <div className="flex flex-col gap-3">
            {quotaExhausted && (
              <Banner
                variant="warning"
                icon={<Clock size={16} className="text-warning-fg" />}
                title="Cota de e-mails esgotada hoje"
                description="Os contatos serão salvos sem Mídia Kit. Você pode enviar manualmente depois pelo editor."
              />
            )}
            <Checkbox
              checked={quotaExhausted ? false : sendKit}
              onChange={setSendKit}
              disabled={quotaExhausted}
              label="Enviar Mídia Kit pra todos?"
            />
          </div>
        </Card>

        {/* Card 2 — idioma (só quando sendKit ON e quota OK) */}
        {!quotaExhausted && sendKit && (
          <Card padding="md">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-text-default">
                Idioma do Mídia Kit
              </p>
              <div className="flex rounded-md overflow-hidden border border-border-default">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={
                      language === lang
                        ? "flex-1 min-h-9 px-3 text-xs font-bold bg-azul-noturno text-white"
                        : "flex-1 min-h-9 px-3 text-xs font-semibold text-text-muted"
                    }
                  >
                    {LANGUAGE_LABELS[lang]}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onStart({ sendKit: quotaExhausted ? false : sendKit, language })}
          className="w-full rounded-xl bg-[#FA6801] py-3.5 text-base font-semibold text-white active:bg-[#E55D00] transition-colors"
        >
          Começar revisão
        </button>
        {!quotaExhausted && (
          <button
            type="button"
            onClick={onSkip}
            className="w-full py-2 text-sm font-medium text-text-muted"
          >
            Pular envio do Mídia Kit
          </button>
        )}
      </div>
    </div>
  );
}
