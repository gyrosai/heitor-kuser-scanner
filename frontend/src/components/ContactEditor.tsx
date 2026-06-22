"use client";

import { useEffect, useState } from "react";
import {
  ClassificacaoState,
  ContactData,
  ContactRecord,
  EmailLanguage,
  classificacoesToTags,
  tagsToClassificacoes,
} from "@/lib/types";
import { ALLOWED_TAGS } from "@/lib/types";
import {
  deleteContact,
  getContact,
  sendMediaKit,
  syncContactToGoogle,
  updateContact,
} from "@/lib/api";
import { useToast } from "./Toast";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import CardImagePreview from "./CardImagePreview";
import GoogleLogo from "./GoogleLogo";
import ClassificacaoSection from "./contact/ClassificacaoSection";
import EmailKitSection from "./contact/EmailKitSection";
import {
  AppHeader,
  BottomBar,
  Button,
  Chip,
  Divider,
  Input,
  Section,
  StarRating,
  Textarea,
} from "@/components/ui";

interface ContactEditorProps {
  contactId: number;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  senderEmail?: string;
  quotaExhausted?: boolean;
}

const EDITABLE_FIELDS = [
  "name",
  "phone",
  "email",
  "company",
  "role",
  "website",
  "notes",
  "event_tag",
  "importance",
  "tags",
  "email_language",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

function diffPayload(
  original: ContactRecord,
  current: ContactData,
): Partial<ContactData> {
  const out: Partial<ContactData> = {};
  for (const field of EDITABLE_FIELDS) {
    const a = (original as ContactData)[field];
    const b = current[field];
    if (field === "tags") {
      const aArr = (a as string[] | undefined) || [];
      const bArr = (b as string[] | undefined) || [];
      if (
        aArr.length !== bArr.length ||
        aArr.some((t, i) => t !== bArr[i])
      ) {
        (out as Record<EditableField, unknown>)[field] = bArr;
      }
    } else if (a !== b) {
      (out as Record<EditableField, unknown>)[field] = b;
    }
  }
  return out;
}

function formatDate(iso?: string | null) {
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

export default function ContactEditor({
  contactId,
  onClose,
  onSaved,
  onDeleted,
  senderEmail,
  quotaExhausted = false,
}: ContactEditorProps) {
  const { showToast } = useToast();
  const { online } = useNetworkStatus();
  const [original, setOriginal] = useState<ContactRecord | null>(null);
  const [form, setForm] = useState<ContactData | null>(null);
  const [classificacao, setClassificacao] = useState<ClassificacaoState>({
    cimi_invest: null,
    cimi_360: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<EmailLanguage>("pt-BR");

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    getContact(contactId)
      .then((rec) => {
        if (cancel) return;
        setOriginal(rec);
        const classificationState = tagsToClassificacoes(rec.tags ?? []);
        setClassificacao(classificationState);
        setForm({
          name: rec.name,
          phone: rec.phone,
          email: rec.email,
          company: rec.company,
          role: rec.role,
          website: rec.website,
          notes: rec.notes,
          source: rec.source,
          event_tag: rec.event_tag,
          importance: rec.importance,
          tags: (rec.tags ?? []).filter(
            (t) => !t.startsWith("cimi_invest:") && !t.startsWith("cimi_360:"),
          ),
          email_language: rec.email_language ?? "pt-BR",
        });
        setSelectedLanguage(rec.email_language ?? "pt-BR");
      })
      .catch((e) => {
        console.error("Erro ao carregar contato:", e);
        if (!cancel) {
          showToast("Erro ao carregar contato", "error");
          onClose();
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [contactId, onClose, showToast]);

  const update = <K extends keyof ContactData>(
    field: K,
    value: ContactData[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!form || !original) return;
    if (!form.name?.trim()) {
      showToast("Nome é obrigatório", "error");
      return;
    }

    const classificationTags = classificacoesToTags(classificacao);
    const allInterestTags = form.tags ?? [];
    const cleaned: ContactData = {
      ...form,
      name: form.name.trim(),
      event_tag: form.event_tag?.trim() || null,
      tags: [...allInterestTags, ...classificationTags],
      email_language: selectedLanguage,
    };
    const payload = diffPayload(original, cleaned);
    if (Object.keys(payload).length === 0 && !emailEnabled) {
      showToast("Nada para salvar", "info");
      return;
    }

    setSaving(true);
    try {
      if (Object.keys(payload).length > 0) {
        await updateContact(contactId, payload);
      }

      if (emailEnabled && original.email_status !== "sent") {
        if (!online) {
          // TODO Fase 5C: ao voltar online, identificar contatos com email_status='skipped' recentes E preferência de
          //              envio originalmente true, e disparar retry. Requer 'queued' no backend pra ser semanticamente correto.
          showToast("Contato salvo. Envio offline — tente enviar quando estiver online.", "info");
        } else {
          try {
            await sendMediaKit(contactId, { language: selectedLanguage });
            showToast("Mídia Kit enviado.", "success");
          } catch (sendError) {
            showToast(
              sendError instanceof Error
                ? sendError.message
                : "Falha no envio do Mídia Kit.",
              "error",
            );
            // Contato continua salvo — não aborta
          }
        }
      }

      showToast("Contato salvo.", "success");
      onSaved();
    } catch (e) {
      console.error("Erro ao atualizar contato:", e);
      showToast(
        e instanceof Error ? e.message : "Erro ao atualizar contato",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteContact(contactId);
      showToast("Contato excluído", "success");
      onDeleted();
    } catch (e) {
      console.error("Erro ao excluir contato:", e);
      showToast(
        e instanceof Error ? e.message : "Erro ao excluir contato",
        "error",
      );
      setDeleting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncContactToGoogle(contactId);
      showToast("Sincronizado com Google Contacts", "success");
      const refreshed = await getContact(contactId);
      setOriginal(refreshed);
    } catch (e) {
      console.error("Erro ao sincronizar:", e);
      showToast(
        e instanceof Error ? e.message : "Erro ao sincronizar com Google",
        "error",
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleResend = async () => {
    setSaving(true);
    try {
      await sendMediaKit(contactId, { language: selectedLanguage, force: true });
      showToast("Mídia Kit reenviado.", "success");
      const refreshed = await getContact(contactId);
      setOriginal(refreshed);
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Falha no reenvio.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = async () => {
    setSaving(true);
    try {
      await sendMediaKit(contactId, { language: selectedLanguage });
      showToast("Mídia Kit enviado.", "success");
      const refreshed = await getContact(contactId);
      setOriginal(refreshed);
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Falha no envio.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form || !original) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-app-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-laranja-360 border-t-transparent" />
      </div>
    );
  }

  const toggleInterestTag = (tag: string) => {
    const current = form.tags ?? [];
    update(
      "tags",
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  };

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      <AppHeader title="Editar contato" onBack={onClose} />

      <div className="flex-1 pb-2">
        {original.has_image && (
          <div className="px-4 pt-4">
            <CardImagePreview contactId={contactId} />
          </div>
        )}

        <Section title="Dados pessoais">
          <div className="flex flex-col gap-3">
            <Input
              label="Nome"
              required
              id="editor-name"
              value={form.name || ""}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Nome completo"
            />
            <Input
              label="Telefone"
              id="editor-phone"
              type="tel"
              value={form.phone || ""}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+55 11 99999-0000"
            />
            <Input
              label="E-mail"
              id="editor-email"
              type="email"
              value={form.email || ""}
              onChange={(e) => update("email", e.target.value)}
              placeholder="nome@empresa.com"
            />
          </div>
        </Section>

        <Divider />

        <Section title="Empresa">
          <div className="flex flex-col gap-3">
            <Input
              label="Empresa"
              id="editor-company"
              value={form.company || ""}
              onChange={(e) => update("company", e.target.value)}
              placeholder="Nome da empresa"
            />
            <Input
              label="Cargo"
              id="editor-role"
              value={form.role || ""}
              onChange={(e) => update("role", e.target.value)}
              placeholder="CEO, Marketing..."
            />
            <Input
              label="Website"
              id="editor-website"
              type="url"
              value={form.website || ""}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://empresa.com"
            />
          </div>
        </Section>

        <Divider />

        <Section title="Avaliação">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold text-text-muted mb-2">
                Importância
              </p>
              <StarRating
                value={form.importance ?? 0}
                onChange={(v) => update("importance", v as 1 | 2 | 3 | null)}
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-text-muted mb-2">
                {/* TODO: "Palestrante" é palavra banida pelo brand guide CIMI360 — remover/renomear na revisão de brand */}
                Tipo de interesse
              </p>
              <div className="flex flex-wrap gap-2">
                {ALLOWED_TAGS.map((tag) => (
                  <Chip
                    key={tag}
                    active={(form.tags ?? []).includes(tag)}
                    onClick={() => toggleInterestTag(tag)}
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Divider />

        <ClassificacaoSection value={classificacao} onChange={setClassificacao} />

        <Divider />

        <EmailKitSection
          emailStatus={original.email_status}
          emailSentAt={original.email_sent_at}
          emailLanguage={original.email_language}
          emailError={original.email_error}
          contactEmail={form.email}
          contactName={form.name}
          senderEmail={senderEmail}
          checked={emailEnabled}
          onCheckedChange={setEmailEnabled}
          selectedLanguage={selectedLanguage}
          onLanguageChange={(lang) => {
            setSelectedLanguage(lang);
            update("email_language", lang);
          }}
          onResend={handleResend}
          onRetry={handleRetry}
          quotaExhausted={quotaExhausted}
          networkOnline={online}
        />

        <Divider />

        <Section title="Observações">
          <Textarea
            id="editor-notes"
            value={form.notes || ""}
            onChange={(e) => update("notes", e.target.value)}
            rows={4}
            placeholder="Notas sobre o contato..."
          />
        </Section>

        <Divider />

        <Section title="Evento">
          <Input
            id="editor-event"
            value={form.event_tag || ""}
            onChange={(e) => update("event_tag", e.target.value)}
            placeholder="Ex: Web Summit 2026"
          />
        </Section>

        <Divider />

        {!original.google_contact_id && (
          <div className="px-5 py-3">
            <Button
              variant="secondary"
              fullWidth
              loading={syncing}
              onClick={handleSync}
              leftIcon={!syncing && <GoogleLogo />}
            >
              {syncing ? "Sincronizando..." : "Sincronizar com Google"}
            </Button>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-text-subtle space-y-1 px-4 pb-2">
          <p>Escaneado em {formatDate(original.scanned_at)}</p>
          {original.updated_at && original.updated_at !== original.scanned_at && (
            <p>Atualizado em {formatDate(original.updated_at)}</p>
          )}
          {original.google_contact_id && (
            <p className="text-success-fg font-semibold">✓ Sincronizado com Google</p>
          )}
        </div>
      </div>

      <BottomBar>
        <Button
          fullWidth
          size="lg"
          loading={saving}
          disabled={!form.name?.trim()}
          onClick={handleSave}
        >
          Salvar alterações
        </Button>

        {!confirmDelete ? (
          <Button
            fullWidth
            variant="destructive"
            size="md"
            disabled={deleting}
            onClick={() => setConfirmDelete(true)}
          >
            Excluir contato
          </Button>
        ) : (
          <div className="rounded-xl border border-danger-border bg-danger-bg p-3 flex flex-col gap-2">
            <p className="text-sm text-danger-fg font-semibold text-center">
              Tem certeza? Ação irreversível.
            </p>
            {original.google_contact_id && (
              <p className="text-xs text-danger-fg text-center">
                O contato também será removido do Google Contacts.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                fullWidth
                loading={deleting}
                onClick={handleDelete}
              >
                {deleting ? "Excluindo..." : "Excluir mesmo"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </BottomBar>
    </div>
  );
}
