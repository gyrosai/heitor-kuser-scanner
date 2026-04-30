"use client";

import { useEffect, useState } from "react";
import { ContactData, ContactRecord, Importance } from "@/lib/types";
import {
  deleteContact,
  getContact,
  syncContactToGoogle,
  updateContact,
} from "@/lib/api";
import { useToast } from "./Toast";
import CardImagePreview from "./CardImagePreview";
import Field from "./Field";
import StarRating from "./StarRating";
import TagChips from "./TagChips";

interface ContactEditorProps {
  contactId: number;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
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
}: ContactEditorProps) {
  const { showToast } = useToast();
  const [original, setOriginal] = useState<ContactRecord | null>(null);
  const [form, setForm] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    getContact(contactId)
      .then((rec) => {
        if (cancel) return;
        setOriginal(rec);
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
          tags: rec.tags || [],
        });
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
    const cleaned: ContactData = {
      ...form,
      name: form.name.trim(),
      event_tag: form.event_tag?.trim() || null,
    };
    const payload = diffPayload(original, cleaned);
    if (Object.keys(payload).length === 0) {
      showToast("Nada para salvar", "info");
      return;
    }
    setSaving(true);
    try {
      await updateContact(contactId, payload);
      showToast("Contato atualizado", "success");
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

  if (loading || !form || !original) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FA6801] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm font-medium text-[#FA6801]"
          >
            ← Voltar
          </button>
          <h2 className="text-base font-semibold text-slate-800">
            Editar contato
          </h2>
          <span className="w-12" />
        </div>
      </header>

      <div className="px-4 py-6">
        {original.has_image && (
          <div className="mb-4">
            <CardImagePreview contactId={contactId} />
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
          />
        </div>

        <div className="mt-8 space-y-3">
          <button
            onClick={handleSave}
            disabled={saving || !form.name?.trim()}
            className="w-full rounded-xl bg-[#FA6801] py-[14px] text-lg font-semibold text-white disabled:opacity-40 active:bg-[#E55D00] transition-colors"
            style={{ minHeight: 52 }}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>

          {!original.google_contact_id && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full rounded-xl border border-slate-300 bg-white py-[14px] text-base font-semibold text-slate-700 disabled:opacity-40 active:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              style={{ minHeight: 52 }}
            >
              {syncing ? (
                "Sincronizando..."
              ) : (
                <>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sincronizar com Google
                </>
              )}
            </button>
          )}

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="w-full rounded-xl border border-red-200 bg-white py-[14px] text-base font-semibold text-red-600 disabled:opacity-40 active:bg-red-50 transition-colors"
              style={{ minHeight: 52 }}
            >
              Excluir contato
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-sm text-red-700 font-medium">
                Tem certeza? Essa ação não pode ser desfeita.
              </p>
              {original.google_contact_id && (
                <p className="text-xs text-red-600">
                  O contato também será removido do Google Contacts.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {deleting ? "Excluindo..." : "Excluir mesmo"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium text-slate-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-slate-400 space-y-1">
          <p>Escaneado em {formatDate(original.scanned_at)}</p>
          {original.updated_at && original.updated_at !== original.scanned_at && (
            <p>Atualizado em {formatDate(original.updated_at)}</p>
          )}
          {original.google_contact_id && (
            <p className="text-emerald-600">✓ Sincronizado com Google</p>
          )}
        </div>
      </div>
    </div>
  );
}
