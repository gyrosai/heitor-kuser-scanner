"use client";

import { useState } from "react";
import { ContactData } from "@/lib/types";

const DEFAULT_EVENT_TAG = process.env.NEXT_PUBLIC_DEFAULT_EVENT_TAG || "";

interface ContactPreviewProps {
  contact: ContactData;
  onSave: (contact: ContactData) => void;
  onReset: () => void;
}

export default function ContactPreview({
  contact,
  onSave,
  onReset,
}: ContactPreviewProps) {
  const [form, setForm] = useState<ContactData>({
    ...contact,
    event_tag: contact.event_tag || DEFAULT_EVENT_TAG,
  });

  const update = (field: keyof ContactData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value || null }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, name: form.name.trim() });
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-4 py-6">
      <h2 className="mb-6 text-xl font-semibold text-white text-center">
        Dados do Contato
      </h2>

      {contact.incomplete && (
        <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-400 text-center">
          Alguns dados podem estar incompletos
        </div>
      )}

      <div className="space-y-4">
        <Field
          label="Nome *"
          value={form.name}
          onChange={(v) => update("name", v)}
          type="text"
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
          type="text"
        />
        <Field
          label="Cargo"
          value={form.role || ""}
          onChange={(v) => update("role", v)}
          type="text"
        />
        <Field
          label="Website"
          value={form.website || ""}
          onChange={(v) => update("website", v)}
          type="url"
        />
        <Field
          label="Tag do Evento"
          value={form.event_tag || ""}
          onChange={(v) => update("event_tag", v)}
          type="text"
        />
      </div>

      <div className="mt-8 space-y-3">
        <button
          onClick={handleSave}
          disabled={!form.name.trim()}
          className="w-full rounded-2xl bg-green-500 py-4 text-lg font-semibold text-white disabled:opacity-40 active:bg-green-600 transition-colors"
        >
          Salvar Contato
        </button>
        <button
          onClick={onReset}
          className="w-full rounded-2xl bg-white/10 py-4 text-lg font-semibold text-white active:bg-white/20 transition-colors"
        >
          Escanear Outro
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  required?: boolean;
}) {
  const isEmpty = required && !value.trim();
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border bg-[#1a1a2e] px-4 py-3 text-white outline-none transition-colors ${
          isEmpty
            ? "border-amber-500/50 focus:border-amber-500"
            : "border-[#2a2a3e] focus:border-indigo-500"
        }`}
      />
    </div>
  );
}
