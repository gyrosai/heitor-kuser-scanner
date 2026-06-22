"use client";

import { useEffect, useState } from "react";
import {
  ClassificacaoState,
  ContactData,
  EmailLanguage,
  Importance,
  classificacoesToTags,
  tagsToClassificacoes,
} from "@/lib/types";
import CardImagePreview from "./CardImagePreview";
import Field from "./Field";
import StarRating from "./StarRating";
import TagChips from "./TagChips";
import ClassificacaoSection from "./contact/ClassificacaoSection";
import ObservacaoAudio from "./contact/ObservacaoAudio";

const LEGACY_EVENT_KEY = "heitor_scanner_last_event_tag";
export const LAST_EVENT_KEY = "cimi_leads_last_event_tag";

// Tags que NÃO são classificação CIMI (são do TagChips / interesse)
function isClassificationTag(tag: string) {
  return tag.startsWith("cimi_invest:") || tag.startsWith("cimi_360:");
}

interface ContactPreviewProps {
  contact: ContactData;
  contactId?: number;
  onSave: (contact: ContactData) => void;
  onReset: () => void;
  saving?: boolean;
  saveLabel?: string;
}

// ── Seção de Idioma do e-mail ─────────────────────────────────────────────────

function EmailLanguageSection({
  value,
  onChange,
}: {
  value: EmailLanguage;
  onChange: (v: EmailLanguage) => void;
}) {
  const options: { code: EmailLanguage; label: string }[] = [
    { code: "pt-BR", label: "PT" },
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-600">
        Idioma do e-mail
      </label>
      <div className="flex gap-3">
        {options.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            className={`px-4 py-2 rounded-lg min-w-[60px] min-h-[44px] font-medium transition-colors ${
              value === code
                ? "bg-[#FA6801] text-white"
                : "bg-gray-100 text-gray-700 active:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── ContactPreview principal ──────────────────────────────────────────────────

export default function ContactPreview({
  contact,
  contactId,
  onSave,
  onReset,
  saving = false,
  saveLabel = "Salvar Contato",
}: ContactPreviewProps) {
  // Tags de interesse (não-classificação)
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

    // Valida classificação: se checkbox marcado, subtipo é obrigatório (já garantido pelo toggle)
    const classificationTags = classificacoesToTags(classificacao);
    const allTags = [...(form.tags || []), ...classificationTags];

    const payload: ContactData = {
      ...form,
      name: form.name.trim(),
      event_tag: form.event_tag?.trim() || null,
      tags: allTags,
    };
    onSave(payload);
  };

  // Quando áudio transcreve, preenche notes
  const handleTranscribed = (notes: string) => {
    update("notes", notes);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 pb-12">
      <h2 className="mb-4 text-xl font-semibold text-slate-800 text-center">
        Dados do Contato
      </h2>

      {contactId != null && (
        <div className="mb-4">
          <CardImagePreview contactId={contactId} />
        </div>
      )}

      {contact.incomplete && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 text-center">
          Alguns dados podem estar incompletos
        </div>
      )}

      <div className="space-y-4">
        <Field
          label="Nome *"
          value={form.name || ""}
          onChange={(v) => update("name", v)}
          required
        />
        <Field
          label="Telefone"
          value={form.phone || ""}
          onChange={(v) => update("phone", v)}
          type="tel"
        />
        <Field
          label="Email"
          value={form.email || ""}
          onChange={(v) => update("email", v)}
          type="email"
        />
        <Field
          label="Empresa"
          value={form.company || ""}
          onChange={(v) => update("company", v)}
        />
        <Field
          label="Cargo"
          value={form.role || ""}
          onChange={(v) => update("role", v)}
        />
        <Field
          label="Website"
          value={form.website || ""}
          onChange={(v) => update("website", v)}
          type="url"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Importância
          </label>
          <StarRating
            value={form.importance as Importance}
            onChange={(v) => update("importance", v)}
            size="lg"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Tipo de interesse
          </label>
          <TagChips
            value={form.tags || []}
            onChange={(tags) => update("tags", tags)}
          />
        </div>

        {/* Classificação CIMI */}
        <ClassificacaoSection value={classificacao} onChange={setClassificacao} />

        {/* Idioma do e-mail */}
        <EmailLanguageSection
          value={form.email_language}
          onChange={(v) => update("email_language", v)}
        />

        {/* Áudio + Observações */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">
            Observações
          </label>
          <ObservacaoAudio onTranscribed={handleTranscribed} />
          <textarea
            value={form.notes || ""}
            onChange={(e) => update("notes", e.target.value)}
            rows={4}
            placeholder="Notas sobre o contato..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition-colors focus:border-[#FA6801] focus:ring-2 focus:ring-[#FA6801]/20 resize-none"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-600">Evento</label>
            {form.event_tag && (
              <button
                type="button"
                onClick={() => {
                  update("event_tag", "");
                  setTimeout(() => document.getElementById("event-tag-input")?.focus(), 0);
                }}
                className="text-xs text-[#FA6801] underline-offset-2 hover:underline"
              >
                Trocar evento
              </button>
            )}
          </div>
          <input
            id="event-tag-input"
            type="text"
            value={form.event_tag || ""}
            placeholder="Ex: Web Summit 2026"
            onChange={(e) => update("event_tag", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition-colors focus:border-[#FA6801] focus:ring-2 focus:ring-[#FA6801]/20"
          />
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <button
          onClick={handleSave}
          disabled={!form.name?.trim() || saving}
          className="w-full rounded-xl bg-[#FA6801] py-[14px] text-lg font-semibold text-white disabled:opacity-40 active:bg-[#E55D00] transition-colors"
          style={{ minHeight: 52 }}
        >
          {saving ? "Salvando..." : saveLabel}
        </button>
        <button
          onClick={onReset}
          disabled={saving}
          className="w-full rounded-xl border border-[#FA6801]/30 bg-white py-[14px] text-lg font-semibold text-[#FA6801] active:bg-[#FFF3EB] transition-colors disabled:opacity-40"
          style={{ minHeight: 52 }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
