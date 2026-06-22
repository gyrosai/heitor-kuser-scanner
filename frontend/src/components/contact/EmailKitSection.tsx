"use client";

import { Badge, Banner, Button, Card, Checkbox, Divider, Section } from "@/components/ui";
import { EmailLanguage } from "@/lib/types";
import { MailCheck, MailX, Clock } from "lucide-react";

interface EmailKitSectionProps {
  emailStatus?: "sent" | "failed" | "skipped" | null;
  emailSentAt?: string | null;
  emailLanguage?: EmailLanguage | null;
  emailError?: string | null;
  contactEmail?: string | null;
  contactName?: string;
  senderEmail?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  selectedLanguage: EmailLanguage;
  onLanguageChange: (v: EmailLanguage) => void;
  onResend: () => void;
  onRetry: () => void;
  quotaExhausted?: boolean;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const LANGUAGE_LABELS: Record<EmailLanguage, string> = {
  "pt-BR": "PT",
  en: "EN",
  es: "ES",
};

export default function EmailKitSection({
  emailStatus,
  emailSentAt,
  emailLanguage,
  emailError,
  contactEmail,
  contactName,
  senderEmail,
  checked,
  onCheckedChange,
  selectedLanguage,
  onLanguageChange,
  onResend,
  onRetry,
  quotaExhausted = false,
}: EmailKitSectionProps) {
  if (!contactEmail) {
    return (
      <Section title="Mídia Kit por E-mail">
        <p className="text-sm text-text-muted">
          Adicione um e-mail para enviar o Mídia Kit.
        </p>
      </Section>
    );
  }

  if (emailStatus === "sent") {
    return (
      <Section title="Mídia Kit por E-mail">
        <Banner
          variant="success"
          icon={<MailCheck size={16} className="text-success-fg" />}
          title="Mídia Kit enviado"
          description={`${fmtDate(emailSentAt)}${emailLanguage ? ` · ${LANGUAGE_LABELS[emailLanguage as EmailLanguage] ?? emailLanguage}` : ""}`}
          actions={
            <Button variant="ghost" size="sm" onClick={onResend}>
              Reenviar
            </Button>
          }
        />
      </Section>
    );
  }

  if (emailStatus === "failed") {
    return (
      <Section title="Mídia Kit por E-mail">
        <Banner
          variant="danger"
          icon={<MailX size={16} className="text-danger-fg" />}
          title="Falha no envio"
          description={emailError ?? "Erro desconhecido"}
          actions={
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Tentar novamente
            </Button>
          }
        />
      </Section>
    );
  }

  if (quotaExhausted) {
    return (
      <Section title="Mídia Kit por E-mail">
        <Banner
          variant="warning"
          icon={<Clock size={16} className="text-warning-fg" />}
          title="Cota diária esgotada"
          description="Você atingiu o limite de e-mails de hoje. O envio será liberado amanhã."
          actions={
            <Checkbox
              checked={false}
              onChange={() => {}}
              disabled
              label="Enviar Mídia Kit"
            />
          }
        />
      </Section>
    );
  }

  // Default: pending / null — tem email, sem envio ainda
  return (
    <Section title="Mídia Kit por E-mail">
      <div className="flex flex-col gap-3">
        <Checkbox
          checked={checked}
          onChange={onCheckedChange}
          label="Enviar Mídia Kit ao salvar"
        />

        {checked && (
          <>
            <Card padding="sm">
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex gap-2">
                  <span className="text-text-muted w-8 shrink-0">Para</span>
                  <span className="text-text-default font-medium truncate">
                    {contactName ? `${contactName} <${contactEmail}>` : contactEmail}
                  </span>
                </div>
                <Divider />
                <div className="flex gap-2">
                  <span className="text-text-muted w-8 shrink-0">De</span>
                  <span className="text-text-default font-medium truncate">
                    {senderEmail ?? "—"}
                  </span>
                </div>
                <Divider />
                <div className="flex items-center gap-2">
                  <span className="text-text-muted w-8 shrink-0">Idioma</span>
                  <div className="flex gap-2">
                    {(["pt-BR", "en", "es"] as EmailLanguage[]).map((lang) => (
                      <Badge
                        key={lang}
                        variant={selectedLanguage === lang ? "info" : "neutral"}
                      >
                        <button
                          type="button"
                          onClick={() => onLanguageChange(lang)}
                          className="font-semibold"
                        >
                          {LANGUAGE_LABELS[lang]}
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </Section>
  );
}
