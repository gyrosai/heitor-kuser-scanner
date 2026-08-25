"use client";

import { Banner, Button, Card, Checkbox, Divider, Section } from "@/components/ui";
import { EmailLanguage } from "@/lib/types";
import { MaterialsPayload, TemplatesPayload } from "@/lib/materials";
import { CloudOff, Clock, MailCheck, MailX } from "lucide-react";
import PackagePicker from "./PackagePicker";

interface EmailKitSectionProps {
  emailStatus?: "sent" | "failed" | "skipped" | null;
  emailSentAt?: string | null;
  emailLanguage?: EmailLanguage | null;
  emailError?: string | null;
  contactEmail?: string | null;
  contactName?: string;
  eventTag?: string | null;
  senderEmail?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  selectedLanguage: EmailLanguage;
  onLanguageChange: (v: EmailLanguage) => void;
  onResend?: () => void;
  onRetry?: () => void;
  quotaExhausted?: boolean;
  networkOnline?: boolean;

  /**
   * Pacote de materiais (produto → template → materiais). Tudo opcional:
   * sem `materialsData`/`templatesData` (ou sem produto selecionado), o
   * comportamento é 100% o legado — mídia kit fixo, texto/checkbox de antes.
   */
  materialsData?: MaterialsPayload | null;
  templatesData?: TemplatesPayload | null;
  selectedProduct?: string | null;
  onProductChange?: (productKey: string | null) => void;
  selectedMaterialIds?: number[];
  onMaterialIdsChange?: (ids: number[]) => void;
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
  eventTag,
  senderEmail,
  checked,
  onCheckedChange,
  selectedLanguage,
  onLanguageChange,
  onResend = undefined,
  onRetry = undefined,
  quotaExhausted = false,
  networkOnline = true,
  materialsData = null,
  templatesData = null,
  selectedProduct = null,
  onProductChange = () => {},
  selectedMaterialIds = [],
  onMaterialIdsChange = () => {},
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

  const checkboxLabel = selectedProduct ? "Enviar pacote ao salvar" : "Enviar Mídia Kit ao salvar";
  const isOfflineWithEmail = !networkOnline && checked;

  const packageConfig = materialsData && (
    <PackagePicker
      materialsData={materialsData}
      templatesData={templatesData}
      selectedProduct={selectedProduct}
      onProductChange={onProductChange}
      selectedMaterialIds={selectedMaterialIds}
      onMaterialIdsChange={onMaterialIdsChange}
      selectedLanguage={selectedLanguage}
      contactName={contactName}
      eventTag={eventTag}
    />
  );

  const languageAndContactCard = (
    <Card padding="sm">
      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex gap-2">
          <span className="text-text-muted w-14 shrink-0">Para</span>
          <span className="text-text-default font-medium truncate">
            {contactName ? `${contactName} <${contactEmail}>` : contactEmail}
          </span>
        </div>
        <Divider />
        <div className="flex gap-2">
          <span className="text-text-muted w-14 shrink-0">De</span>
          <span className="text-text-default font-medium truncate">
            {senderEmail ?? "—"}
          </span>
        </div>
        <Divider />
        <div className="flex items-center gap-3">
          <span className="text-text-muted w-14 shrink-0">Idioma</span>
          <div className="flex rounded-md overflow-hidden border border-border-default">
            {(["pt-BR", "en", "es"] as EmailLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguageChange(lang)}
                className={
                  selectedLanguage === lang
                    ? "flex-1 min-h-9 px-3 text-xs font-bold bg-azul-noturno text-white"
                    : "flex-1 min-h-9 px-3 text-xs font-semibold text-text-muted"
                }
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );

  if (quotaExhausted) {
    return (
      <Section title="Mídia Kit por E-mail">
        <div className="flex flex-col gap-3">
          <Banner
            variant="warning"
            icon={<Clock size={16} className="text-warning-fg" />}
            title="Cota diária esgotada"
            // TODO: adicionar reset_at no backend (check_daily_quota → EmailLog mais antigo) pra mostrar countdown preciso
            description="Os envios reabrem conforme os e-mails do dia completarem 24h. Você pode salvar o contato sem enviar agora."
          />
          <Checkbox
            checked={false}
            onChange={() => {}}
            disabled
            label="Enviar Mídia Kit ao salvar — Indisponível"
            labelClassName="line-through"
          />
        </div>
      </Section>
    );
  }

  if (emailStatus === "sent") {
    return (
      <Section title="Mídia Kit por E-mail">
        <div className="flex flex-col gap-3">
          <Banner
            variant="success"
            icon={<MailCheck size={16} className="text-success-fg" />}
            title="Mídia Kit enviado"
            description={`${fmtDate(emailSentAt)}${emailLanguage ? ` · ${LANGUAGE_LABELS[emailLanguage as EmailLanguage] ?? emailLanguage}` : ""}`}
          />
          {packageConfig}
          {languageAndContactCard}
          {onResend && (
            <Button variant="ghost" size="sm" onClick={onResend}>
              Reenviar
            </Button>
          )}
        </div>
      </Section>
    );
  }

  if (emailStatus === "failed") {
    return (
      <Section title="Mídia Kit por E-mail">
        <div className="flex flex-col gap-3">
          <Banner
            variant="danger"
            icon={<MailX size={16} className="text-danger-fg" />}
            title="Falha no envio"
            description={emailError ?? "Erro desconhecido"}
          />
          {packageConfig}
          {languageAndContactCard}
          {onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Tentar novamente
            </Button>
          )}
        </div>
      </Section>
    );
  }

  if (emailStatus === "skipped") {
    return (
      <Section title="Mídia Kit por E-mail">
        <div className="flex flex-col gap-3">
          <Banner
            variant="warning"
            icon={<CloudOff size={16} className="text-warning-fg" />}
            title="Envio pendente"
            description="O contato foi salvo mas o e-mail não foi enviado. Envie quando estiver online."
          />
          {packageConfig}
          {languageAndContactCard}
          {networkOnline && onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Enviar agora
            </Button>
          )}
        </div>
      </Section>
    );
  }

  // Default: pending / null — tem email, sem envio ainda
  return (
    <Section title="Mídia Kit por E-mail">
      <div className="flex flex-col gap-3">
        {isOfflineWithEmail && (
          <Banner
            variant="warning"
            icon={<CloudOff size={16} className="text-warning-fg" />}
            title="Envio aguardando conexão"
            description="Sem conexão no momento. Salvar agora vai marcar o contato como pendente. Você pode tentar enviar quando o Wi-Fi voltar."
            // TODO Fase 5C: adicionar email_status='queued' no backend + retry automático ao reconectar
          />
        )}

        <Checkbox
          checked={checked}
          onChange={onCheckedChange}
          label={
            isOfflineWithEmail
              ? `${checkboxLabel} (offline — será marcado como pendente)`
              : checkboxLabel
          }
        />

        {languageAndContactCard}
        {packageConfig}
      </div>
    </Section>
  );
}
