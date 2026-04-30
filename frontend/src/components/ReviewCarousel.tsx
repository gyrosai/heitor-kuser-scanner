"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiConflictError,
  type ConflictError,
  type ContactData,
  type Importance,
} from "@/lib/types";
import { mergeContact, saveContact } from "@/lib/api";
import {
  deletePendingScan,
  getPendingScan,
  listPendingScans,
  updatePendingScan,
  type PendingScan,
} from "@/lib/pendingScans";
import { useToast } from "./Toast";
import { LAST_EVENT_KEY } from "./ContactPreview";
import DuplicateModal from "./DuplicateModal";
import Field from "./Field";
import StarRating from "./StarRating";
import TagChips from "./TagChips";

interface ReviewCarouselProps {
  startIndex?: number;
  onClose: () => void;
  onOpenList: () => void;
}

interface ReviewItem {
  scan: PendingScan;
  form: ContactData;
}

function scanToForm(scan: PendingScan, defaultEventTag: string | null): ContactData {
  const ext = scan.extracted_data ?? ({} as Partial<ContactData>);
  return {
    name: ext.name || "",
    phone: ext.phone ?? null,
    email: ext.email ?? null,
    company: ext.company ?? null,
    role: ext.role ?? null,
    website: ext.website ?? null,
    notes: ext.notes ?? null,
    source: ext.source === "qrcode" ? "qrcode" : "card_photo",
    event_tag: ext.event_tag ?? defaultEventTag,
    importance: (ext.importance ?? null) as Importance,
    tags: ext.tags ?? [],
  };
}

export default function ReviewCarousel({
  startIndex = 0,
  onClose,
  onOpenList,
}: ReviewCarouselProps) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [imageData, setImageData] = useState<string | null>(null);
  const [defaultEventTag, setDefaultEventTag] = useState<string | null>(null);
  const [storedSuggestion, setStoredSuggestion] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<ConflictError | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_EVENT_KEY);
      if (stored) setStoredSuggestion(stored);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const scans = await listPendingScans({
        status: "processed",
        includeImage: false,
      });
      if (cancelled) return;
      const initial = scans.map((s) => ({
        scan: s,
        form: scanToForm(s, null),
      }));
      setItems(initial);
      setLoading(false);
      if (initial.length === 0) return;
      const safeIndex = Math.min(startIndex, initial.length - 1);
      setCurrentIndex(safeIndex);
    })();
    return () => {
      cancelled = true;
    };
  }, [startIndex]);

  const current = items[currentIndex];

  // Carrega imagem do scan atual sob demanda.
  useEffect(() => {
    setImageData(null);
    if (!current) return;
    let cancelled = false;
    void getPendingScan(current.scan.id).then((full) => {
      if (cancelled) return;
      if (full?.image_base64) {
        setImageData(`data:image/jpeg;base64,${full.image_base64}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [current]);

  const updateForm = useCallback(
    <K extends keyof ContactData>(field: K, value: ContactData[K]) => {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === currentIndex ? { ...it, form: { ...it.form, [field]: value } } : it,
        ),
      );
    },
    [currentIndex],
  );

  const applyEventTagToRest = () => {
    const tag = current?.form.event_tag?.trim();
    if (!tag) {
      showToast("Digite um nome de evento primeiro", "info");
      return;
    }
    setDefaultEventTag(tag);
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx <= currentIndex) return it;
        if (it.form.event_tag && it.form.event_tag.trim()) return it;
        return { ...it, form: { ...it.form, event_tag: tag } };
      }),
    );
    showToast(
      `"${tag}" aplicado aos próximos ${items.length - currentIndex - 1}`,
      "success",
    );
  };

  const goNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      finalize();
    }
  };

  const finalize = () => {
    if (savedCount > 0) {
      showToast(
        `${savedCount} contato${savedCount === 1 ? "" : "s"} salvo${savedCount === 1 ? "" : "s"}`,
        "success",
      );
    }
    onClose();
  };

  const handleSkip = () => {
    if (!current) return;
    goNext();
  };

  const handleSave = async (finishAfter: boolean) => {
    if (!current) return;
    if (!current.form.name?.trim()) {
      showToast("Nome é obrigatório", "error");
      return;
    }

    setSaving(true);
    const payload: ContactData = {
      ...current.form,
      name: current.form.name.trim(),
      event_tag: current.form.event_tag?.trim() || null,
    };

    try {
      await saveContact(payload, current.scan.contact_id ?? undefined, false);
      if (payload.event_tag) {
        try {
          localStorage.setItem(LAST_EVENT_KEY, payload.event_tag);
          setStoredSuggestion(payload.event_tag);
        } catch {}
      }
      await updatePendingScan(current.scan.id, {
        status: "saved",
        extracted_data: payload,
      });
      // Limpeza imediata: foto não é mais necessária no IndexedDB.
      await deletePendingScan(current.scan.id);
      setSavedCount((n) => n + 1);
      // Remove do array em memória.
      setItems((prev) => prev.filter((_, idx) => idx !== currentIndex));
      // Não incrementa o índice — o próximo agora ocupa a mesma posição.
      if (finishAfter) {
        finalize();
      } else if (currentIndex >= items.length - 1) {
        // Era o último.
        finalize();
      }
    } catch (err) {
      if (err instanceof ApiConflictError) {
        setConflict(err.conflict);
        return;
      }
      console.error("Erro ao salvar:", err);
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar contato",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMerge = async () => {
    if (!conflict || !current) return;
    setSaving(true);
    try {
      await mergeContact(conflict.existing_id, current.form);
      if (current.form.event_tag?.trim()) {
        try {
          localStorage.setItem(LAST_EVENT_KEY, current.form.event_tag.trim());
        } catch {}
      }
      await deletePendingScan(current.scan.id);
      setSavedCount((n) => n + 1);
      setItems((prev) => prev.filter((_, idx) => idx !== currentIndex));
      setConflict(null);
      if (currentIndex >= items.length - 1) finalize();
    } catch (err) {
      console.error("Erro no merge:", err);
      showToast(
        err instanceof Error ? err.message : "Erro ao mesclar",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleForceCreate = async () => {
    if (!conflict || !current) return;
    setSaving(true);
    try {
      await saveContact(current.form, current.scan.contact_id ?? undefined, true);
      if (current.form.event_tag?.trim()) {
        try {
          localStorage.setItem(LAST_EVENT_KEY, current.form.event_tag.trim());
        } catch {}
      }
      await deletePendingScan(current.scan.id);
      setSavedCount((n) => n + 1);
      setItems((prev) => prev.filter((_, idx) => idx !== currentIndex));
      setConflict(null);
      if (currentIndex >= items.length - 1) finalize();
    } catch (err) {
      console.error("Erro ao forçar criação:", err);
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#FA6801] border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0 || !current) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-6">
        <p className="text-lg text-slate-700">Nada pra revisar</p>
        <button
          onClick={onClose}
          className="mt-4 rounded-xl bg-[#FA6801] px-6 py-3 text-base font-semibold text-white"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (conflict) {
    return (
      <DuplicateModal
        existing={conflict.existing}
        newContact={current.form}
        onMerge={handleMerge}
        onForceCreate={handleForceCreate}
        onCancel={() => setConflict(null)}
        busy={saving}
      />
    );
  }

  const isLast = currentIndex === items.length - 1;
  const total = items.length;
  const position = currentIndex + 1;
  const progress = Math.round((position / total) * 100);
  const eventHelper = (() => {
    if (defaultEventTag && !current.form.event_tag?.trim()) {
      return `Aplicado a todos: ${defaultEventTag}`;
    }
    if (storedSuggestion) return `Sugestão: ${storedSuggestion}`;
    return undefined;
  })();

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"
            aria-label="Fechar"
          >
            ✕
          </button>
          <div className="text-center">
            <p className="text-base font-semibold text-slate-800">
              Revisar contatos
            </p>
            <p className="text-xs text-slate-500">
              {position} de {total}
            </p>
          </div>
          <button
            onClick={onOpenList}
            className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
          >
            Ver lista
          </button>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-[#FA6801] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {imageData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageData}
            alt="Foto do cartão"
            className="w-full rounded-xl border border-slate-200 bg-slate-100 object-cover"
            style={{ aspectRatio: "16 / 10" }}
          />
        ) : (
          <div
            className="w-full rounded-xl border border-slate-200 bg-slate-100"
            style={{ aspectRatio: "16 / 10" }}
          />
        )}

        <Field
          label="Nome *"
          value={current.form.name || ""}
          onChange={(v) => updateForm("name", v)}
          required
        />
        <Field
          label="Telefone"
          value={current.form.phone || ""}
          onChange={(v) => updateForm("phone", v)}
          type="tel"
        />
        <Field
          label="Email"
          value={current.form.email || ""}
          onChange={(v) => updateForm("email", v)}
          type="email"
        />
        <Field
          label="Empresa"
          value={current.form.company || ""}
          onChange={(v) => updateForm("company", v)}
        />
        <Field
          label="Cargo"
          value={current.form.role || ""}
          onChange={(v) => updateForm("role", v)}
        />
        <Field
          label="Website"
          value={current.form.website || ""}
          onChange={(v) => updateForm("website", v)}
          type="url"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Importância
          </label>
          <StarRating
            value={current.form.importance as Importance}
            onChange={(v) => updateForm("importance", v)}
            size="lg"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Tipo de interesse
          </label>
          <TagChips
            value={current.form.tags || []}
            onChange={(tags) => updateForm("tags", tags)}
          />
        </div>

        <Field
          label="Observações"
          value={current.form.notes || ""}
          onChange={(v) => updateForm("notes", v)}
          multiline
          rows={3}
        />

        <div>
          <Field
            label="Evento"
            value={current.form.event_tag || ""}
            onChange={(v) => updateForm("event_tag", v)}
            placeholder="Ex: Web Summit 2026"
            helper={eventHelper}
          />
          {!isLast && (
            <button
              onClick={applyEventTagToRest}
              disabled={!current.form.event_tag?.trim()}
              className="mt-2 text-xs font-medium text-[#FA6801] underline disabled:text-slate-300 disabled:no-underline"
            >
              Aplicar a todos os restantes
            </button>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white px-4 py-3 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-base font-medium text-slate-700 disabled:opacity-40 active:bg-slate-50"
            style={{ minHeight: 52 }}
          >
            Pular
          </button>
          {isLast ? (
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !current.form.name?.trim()}
              className="flex-[2] rounded-xl bg-[#FA6801] py-3 text-base font-semibold text-white disabled:opacity-40 active:bg-[#E55D00] transition-colors"
              style={{ minHeight: 52 }}
            >
              {saving ? "Salvando..." : "Salvar e finalizar"}
            </button>
          ) : (
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !current.form.name?.trim()}
              className="flex-[2] rounded-xl bg-[#FA6801] py-3 text-base font-semibold text-white disabled:opacity-40 active:bg-[#E55D00] transition-colors"
              style={{ minHeight: 52 }}
            >
              {saving ? "Salvando..." : "Salvar e próximo"}
            </button>
          )}
        </div>
        {!isLast && (
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !current.form.name?.trim()}
            className="w-full text-xs font-medium text-slate-500 disabled:opacity-40"
          >
            Salvar e finalizar revisão
          </button>
        )}
      </div>
    </div>
  );
}
