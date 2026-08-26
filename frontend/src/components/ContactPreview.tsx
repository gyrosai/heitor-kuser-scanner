"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import {
  ALLOWED_TAGS,
  ClassificacaoState,
  ContactData,
  EmailLanguage,
  Importance,
  PackageSelection,
  classificacoesToTags,
  isInterestTag,
  tagsToClassificacoes,
} from "@/lib/types";
import { useToast } from "@/components/Toast";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import {
  AppHeader,
  Banner,
  BottomBar,
  Button,
  Chip,
  Input,
  StarRating,
  Textarea,
} from "@/components/ui";
import ClassificacaoSection from "./contact/ClassificacaoSection";
import ObservacaoAudio from "./contact/ObservacaoAudio";
import EmailKitSection from "./contact/EmailKitSection";
import CapturePreview from "./scan/CapturePreview";
import { AlertCircle, Camera } from "lucide-react";
import {
  MaterialsPayload,
  TemplatesPayload,
  getMaterialsCached,
  getTemplatesCached,
} from "@/lib/materials";
import { defaultMaterialIds, pickDefaultProduct } from "@/lib/package";

const LEGACY_EVENT_KEY = "heitor_scanner_last_event_tag";
export const LAST_EVENT_KEY = "cimi_leads_last_event_tag";

function isClassificationTag(tag: string) {
  return !isInterestTag(tag);
}

function countNonEmptyFields(contact: ContactData): number {
  return [contact.name, contact.phone, contact.email, contact.company, contact.role, contact.website]
    .filter(Boolean).length;
}

interface ContactPreviewProps {
  contact: ContactData;
  contactId?: number;
  capturedDataUrl?: string;
  senderEmail?: string;
  quotaExhausted?: boolean;
  ocrFailed?: boolean;
  onRetakePhoto?: () => void;
  onSave: (contact: ContactData) => void;
  onReset: () => void;
  saving?: boolean;
}

export default function ContactPreview({
  contact,
  capturedDataUrl,
  senderEmail,
  quotaExhausted = false,
  ocrFailed: ocrFailedProp = false,
  onRetakePhoto,
  onSave,
  onReset,
  saving = false,
}: ContactPreviewProps) {
  const { showToast } = useToast();
  const { online } = useNetworkStatus();
  const [showOcrBanner, setShowOcrBanner] = useState(ocrFailedProp);
  const interestTags = (contact.tags ?? []).filter((t) => !isClassificationTag(t));

  const [form, setForm] = useState<ContactData>({
    ...contact,
    importance: contact.importance ?? null,
    tags: interestTags,
    event_tag: contact.event_tag || "",
    email_language: contact.email_language ?? "pt-BR",
  });

  const [classificacao, setClassificacao] = useState<ClassificacaoState>(() =>
    tagsToClassificacoes(contact.tags ?? [])
  );

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailLanguage, setEmailLanguage] = useState<EmailLanguage>(
    contact.email_language ?? "pt-BR"
  );

  // Pacote de materiais: opcional, tudo aditivo. Sem produto selecionado o
  // fluxo continua sendo o mídia kit fixo (legado), idêntico ao anterior.
  const [materialsData, setMaterialsData] = useState<MaterialsPayload | null>(null);
  const [templatesData, setTemplatesData] = useState<TemplatesPayload | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);

  useEffect(() => {
    let cancel = false;
    getMaterialsCached().then(({ materials }) => {
      if (cancel) return;
      setMaterialsData(materials);
      const preselected = pickDefaultProduct(
        classificacao,
        materials.products.map((p) => p.key),
      );
      if (preselected) {
        const product = materials.products.find((p) => p.key === preselected);
        setSelectedProduct(preselected);
        setSelectedMaterialIds(product ? defaultMaterialIds(product.groups, emailLanguage) : []);
      }
    });
    getTemplatesCached().then(({ templates }) => {
      if (!cancel) setTemplatesData(templates);
    });
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProductChange = (productKey: string | null) => {
    setSelectedProduct(productKey);
    Sentry.addBreadcrumb({
      category: "package",
      message: "package_product_selected",
      data: { product_key: productKey },
    });
  };

  // O save tem timeout de 30s — se demorar mais que ~8s, avisa que ainda está
  // trabalhando pra não deixar o usuário olhando um botão travado no escuro.
  const [slowSave, setSlowSave] = useState(false);
  useEffect(() => {
    if (!saving) return;
    const t = setTimeout(() => setSlowSave(true), 8000);
    return () => {
      clearTimeout(t);
      setSlowSave(false);
    };
  }, [saving]);

  useEffect(() => {
    try {
      let stored = localStorage.getItem(LAST_EVENT_KEY);
      if (!stored) {
        const legacy = localStorage.getItem(LEGACY_EVENT_KEY);
        if (legacy) {
          localStorage.setItem(LAST_EVENT_KEY, legacy);
          localStorage.removeItem(LEGACY_EVENT_KEY);
          stored = legacy;
        }
      }
      if (stored) {
        setForm((prev) => ({ ...prev, event_tag: prev.event_tag || stored }));
      }
    } catch {}
  }, []);

  const update = <K extends keyof ContactData>(field: K, value: ContactData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.name?.trim()) return;

    const classificationTags = classificacoesToTags(classificacao);
    const allTags = [...(form.tags || []), ...classificationTags];

    const shouldSendEmail = emailEnabled && !quotaExhausted && online;
    const packageSelection: PackageSelection | null = selectedProduct
      ? { product_key: selectedProduct, material_ids: selectedMaterialIds }
      : null;

    const payload: ContactData = {
      ...form,
      name: form.name.trim(),
      event_tag: form.event_tag?.trim() || null,
      tags: allTags,
      send_email: shouldSendEmail,
      email_language: emailLanguage,
      package: packageSelection,
    };

    // Estes toasts falam SÓ do Mídia Kit — o save ainda nem aconteceu, então
    // nada aqui pode dizer "salvo" ("Contato salvo!" só aparece na tela de
    // sucesso, depois do backend confirmar).
    if (emailEnabled && quotaExhausted) {
      showToast("Mídia Kit não será enviado (limite diário atingido).", "info");
    } else if (emailEnabled && !online) {
      // TODO Fase 5C: ao voltar online, identificar contatos com email_status='skipped' recentes E preferência de
      //              envio originalmente true, e disparar retry. Requer 'queued' no backend pra ser semanticamente correto.
      showToast("Sem conexão — o Mídia Kit não será enviado agora.", "info");
    }

    if (shouldSendEmail && packageSelection) {
      Sentry.addBreadcrumb({
        category: "package",
        message: "package_sent",
        data: {
          product_key: packageSelection.product_key,
          material_ids: packageSelection.material_ids,
        },
      });
    }

    onSave(payload);
  };

  const handleTranscribed = (notes: string) => {
    update("notes", notes);
  };

  const toggleTag = (tag: string) => {
    const current = form.tags || [];
    if (current.includes(tag)) {
      update("tags", current.filter((t) => t !== tag));
    } else {
      update("tags", [...current, tag]);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      <AppHeader title="Revisar contato" onBack={onReset} />

      <div className="flex-1 px-4 py-4 space-y-4 pb-36">
        {showOcrBanner && (
          <Banner
            variant="danger"
            icon={<AlertCircle size={18} className="text-danger-fg" />}
            title="Não conseguimos ler o cartão"
            description="A foto pode estar borrada, com pouca luz ou em ângulo difícil. Refaça a captura — geralmente resolve."
            actions={
              <div className="flex gap-2 flex-wrap">
                {onRetakePhoto && (
                  <Button
                    variant="destructive"
                    size="sm"
                    leftIcon={<Camera size={13} />}
                    onClick={onRetakePhoto}
                  >
                    Tirar outra foto
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOcrBanner(false)}
                >
                  Preencher manual
                </Button>
              </div>
            }
          />
        )}

        <CapturePreview
          cardImageDataUrl={capturedDataUrl}
          capturedAt={new Date()}
          source={contact.source === "base_heitor" ? "card_photo" : contact.source}
          extractedFields={countNonEmptyFields(contact)}
        />

        {contact.incomplete && (
          <Banner
            variant="warning"
            title="Dados incompletos"
            description="Alguns campos não foram extraídos automaticamente. Revise antes de salvar."
          />
        )}

        <Input
          label="Nome"
          required
          value={form.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
        <Input
          label="Telefone"
          type="tel"
          value={form.phone || ""}
          onChange={(e) => update("phone", e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={form.email || ""}
          onChange={(e) => update("email", e.target.value)}
        />
        <Input
          label="Empresa"
          value={form.company || ""}
          onChange={(e) => update("company", e.target.value)}
        />
        <Input
          label="Cargo"
          value={form.role || ""}
          onChange={(e) => update("role", e.target.value)}
        />
        <Input
          label="Website"
          type="url"
          value={form.website || ""}
          onChange={(e) => update("website", e.target.value)}
        />

        <div>
          <p className="text-xs font-semibold text-text-muted mb-2">Importância</p>
          <StarRating
            value={(form.importance as number) ?? 0}
            onChange={(v) => update("importance", v as Importance)}
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-text-muted mb-2">Tipo de interesse</p>
          <div className="flex flex-wrap gap-2">
            {ALLOWED_TAGS.map((tag) => (
              <Chip
                key={tag}
                active={(form.tags || []).includes(tag)}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Chip>
            ))}
          </div>
        </div>

        <ClassificacaoSection value={classificacao} onChange={setClassificacao} />

        <EmailKitSection
          emailStatus={null}
          contactEmail={form.email}
          contactName={form.name}
          eventTag={form.event_tag}
          senderEmail={senderEmail}
          checked={emailEnabled}
          onCheckedChange={setEmailEnabled}
          selectedLanguage={emailLanguage}
          onLanguageChange={setEmailLanguage}
          quotaExhausted={quotaExhausted}
          networkOnline={online}
          materialsData={materialsData}
          templatesData={templatesData}
          selectedProduct={selectedProduct}
          onProductChange={handleProductChange}
          selectedMaterialIds={selectedMaterialIds}
          onMaterialIdsChange={setSelectedMaterialIds}
        />

        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-muted">Observações</p>
          <ObservacaoAudio onTranscribed={handleTranscribed} />
          <Textarea
            value={form.notes || ""}
            onChange={(e) => update("notes", e.target.value)}
            rows={4}
            placeholder="Notas sobre o contato..."
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold text-text-muted">Evento</p>
            {form.event_tag && (
              <button
                type="button"
                onClick={() => {
                  update("event_tag", "");
                  setTimeout(() => document.getElementById("event-tag-input")?.focus(), 0);
                }}
                className="text-xs text-laranja-360 underline-offset-2 hover:underline"
              >
                Trocar evento
              </button>
            )}
          </div>
          <Input
            id="event-tag-input"
            value={form.event_tag || ""}
            placeholder="Ex: Web Summit 2026"
            onChange={(e) => update("event_tag", e.target.value)}
          />
        </div>
      </div>

      <BottomBar>
        <Button
          variant="primary"
          fullWidth
          loading={saving}
          disabled={!form.name?.trim()}
          onClick={handleSave}
        >
          {saving && slowSave
            ? "Ainda salvando... conexão lenta"
            : emailEnabled
              ? "Salvar e enviar Mídia Kit"
              : "Salvar contato"}
        </Button>
        <Button variant="ghost" fullWidth size="sm" onClick={onReset}>
          Descartar e capturar outro
        </Button>
      </BottomBar>
    </div>
  );
}
