"use client";

import { useEffect, useState } from "react";
import { ContactData, Importance } from "@/lib/types";
import CardImagePreview from "./CardImagePreview";
import Field from "./Field";
import StarRating from "./StarRating";
import TagChips from "./TagChips";

export const LAST_EVENT_KEY = "heitor_scanner_last_event_tag";

interface ContactPreviewProps {
  contact: ContactData;
  contactId?: number;
  onSave: (contact: ContactData) => void;
  onReset: () => void;
  saving?: boolean;
  saveLabel?: string;
}

export default function ContactPreview({
  contact,
  contactId,
  onSave,
  onReset,
  saving = false,
  saveLabel = "Salvar Contato",
}: ContactPreviewProps) {
  const [lastEventTag, setLastEventTag] = useState<string>("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_EVENT_KEY);
      if (stored) setLastEventTag(stored);
    } catch {}
  }, []);

  const [form, setForm] = useState<ContactData>({
    ...contact,
    importance: contact.importance ?? null,
    tags: contact.tags ?? [],
    event_tag: contact.event_tag || "",
  });

  const update = <K extends keyof ContactData>(field: K, value: ContactData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.name?.trim()) return;
    const payload: ContactData = {
      ...form,
      name: form.name.trim(),
      event_tag: form.event_tag?.trim() || null,
    };
    // localStorage do last_event_tag é gravado em page.tsx só após save
    // bem-sucedido (não pode gravar aqui pois ConflictError/erro de rede
    // ainda podem rejeitar o save).
    onSave(payload);
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

        <Field
          label="Observações"
          value={form.notes || ""}
          onChange={(v) => update("notes", v)}
          multiline
          rows={4}
        />

        <Field
          label="Evento"
          value={form.event_tag || ""}
          onChange={(v) => update("event_tag", v)}
          placeholder="Ex: Web Summit 2026"
          helper={lastEventTag ? `Sugestão: ${lastEventTag}` : undefined}
        />
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
