"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiConflictError,
  type ConflictError,
  type ContactData,
  type Importance,
  type PackageSelection,
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
import ClassificacaoSection from "./contact/ClassificacaoSection";
import PackagePicker from "./contact/PackagePicker";
import PackagePreviewText from "./contact/PackagePreviewText";
import { type ClassificacaoState, isInterestTag } from "@/lib/types";
import { classificacoesToTags, tagsToClassificacoes } from "@/lib/taxonomy";
import { defaultMaterialIds, pickDefaultProduct } from "@/lib/package";
import { getMaterialsCached, getTemplatesCached, MaterialsPayload, TemplatesPayload } from "@/lib/materials";

interface SequenceEmailConfig {
  sendKit: boolean;
  language: "pt-BR" | "en" | "es";
  conflictStrategy?: "replace" | "keep_both" | "ask";
  defaultProduct: string | null;
  defaultMaterialIds: number[];
}

interface ReviewCarouselProps {
  startIndex?: number;
  sequenceEmailConfig?: SequenceEmailConfig | null;
  onClose: () => void;
  onOpenList: () => void;
}

interface ReviewItem {
  scan: PendingScan;
  form: ContactData;
  classificacao: ClassificacaoState;
  /** Produto efetivo do item (null = legado). */
  packageProduct: string | null;
  packageMaterialIds: number[];
  /** true = produto foi escolhido manualmente no card; false = derivado. */
  packageOverride: boolean;
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
    email_language: ext.email_language ?? "pt-BR",
  };
}

function buildItemPackage(
  classificacao: ClassificacaoState,
  defaultProduct: string | null,
  materialsData: MaterialsPayload | null,
  language: "pt-BR" | "en" | "es",
): { product: string | null; materialIds: number[] } {
  const productOrder = materialsData?.products.map((p) => p.key) ?? [];
  const product = pickDefaultProduct(classificacao, productOrder) ?? defaultProduct;
  if (!product || !materialsData) return { product: null, materialIds: [] };
  const p = materialsData.products.find((pp) => pp.key === product);
  return { product, materialIds: p ? defaultMaterialIds(p.groups, language) : [] };
}

export default function ReviewCarousel({
  startIndex = 0,
  sequenceEmailConfig = null,
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
  const [replacedCount, setReplacedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [materialsData, setMaterialsData] = useState<MaterialsPayload | null>(null);
  const [templatesData, setTemplatesData] = useState<TemplatesPayload | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_EVENT_KEY);
      if (stored) setStoredSuggestion(stored);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [scans, { materials }, { templates }] = await Promise.all([
        listPendingScans({ status: "processed", includeImage: false }),
        getMaterialsCached(),
        getTemplatesCached(),
      ]);
      if (cancelled) return;
      setMaterialsData(materials);
      setTemplatesData(templates);
      const seq = sequenceEmailConfig ?? { sendKit: false, language: "pt-BR", conflictStrategy: "replace", defaultProduct: null, defaultMaterialIds: [] };
      const initial = scans.map((s) => {
        const form = scanToForm(s, null);
        const classificacao = tagsToClassificacoes(form.tags);
        const ext = s.extracted_data;
        // Restaura package salvo anteriormente (reload ou navegação entre cards)
        if (ext?.package) {
          return {
            scan: s,
            form,
            classificacao,
            packageProduct: ext.package.product_key ?? null,
            packageMaterialIds: ext.package.material_ids ?? [],
            packageOverride: true,
          };
        }
        const { product, materialIds } = buildItemPackage(classificacao, seq.defaultProduct, materials, seq.language);
        return {
          scan: s,
          form,
          classificacao,
          packageProduct: product,
          packageMaterialIds: materialIds,
          packageOverride: false,
        };
      });
      setItems(initial);
      setLoading(false);
      if (initial.length === 0) return;
      const safeIndex = Math.min(startIndex, initial.length - 1);
      setCurrentIndex(safeIndex);
    })();
    return () => {
      cancelled = true;
    };
  }, [startIndex, sequenceEmailConfig]);

  const current = items[currentIndex];

  // Se a classificação mudou e o produto NÃO era override manual, recalcular.
  useEffect(() => {
    if (!current || current.packageOverride || !materialsData) return;
    const seq = sequenceEmailConfig ?? { sendKit: false, language: "pt-BR", conflictStrategy: "replace", defaultProduct: null, defaultMaterialIds: [] };
    const { product, materialIds } = buildItemPackage(current.classificacao, seq.defaultProduct, materialsData, seq.language);
    if (product !== current.packageProduct || materialIds.join(",") !== current.packageMaterialIds.join(",")) {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === currentIndex
            ? { ...it, packageProduct: product, packageMaterialIds: materialIds }
            : it,
        ),
      );
    }
  }, [current, currentIndex, materialsData, sequenceEmailConfig]);

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

  // Persiste o estado do item (form + package) no extracted_data ao navegar
  // entre cards ou ao salvar — garante que reload traz o mesmo package.
  useEffect(() => {
    return () => {
      const item = items[currentIndex];
      if (!item) return;
      const packageSelection: PackageSelection | null = item.packageProduct
        ? { product_key: item.packageProduct, material_ids: item.packageMaterialIds, template_id: null }
        : null;
      const data: ContactData = {
        ...item.form,
        tags: [...(item.form.tags ?? []).filter(isInterestTag), ...classificacoesToTags(item.classificacao)],
        ...(packageSelection && { package: packageSelection }),
      };
      void updatePendingScan(item.scan.id, { extracted_data: data });
    };
  }, [currentIndex, items]);

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

  const updateClassificacao = useCallback(
    (next: ClassificacaoState) => {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === currentIndex ? { ...it, classificacao: next } : it,
        ),
      );
    },
    [currentIndex],
  );

  const updateItemPackage = useCallback(
    (product: string | null, materialIds: number[], override: boolean) => {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === currentIndex
            ? { ...it, packageProduct: product, packageMaterialIds: materialIds, packageOverride: override }
            : it,
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

  const finalize = (extraSaved = 0, extraReplaced = 0, extraSkipped = 0) => {
    const total = savedCount + extraSaved + replacedCount + extraReplaced + skippedCount + extraSkipped;
    if (total > 0) {
      const parts: string[] = [`${total} contato${total === 1 ? "" : "s"} processado${total === 1 ? "" : "s"}`];
      const s = savedCount + extraSaved;
      if (s > 0) parts.push(`${s} salvo${s === 1 ? "" : "s"}`);
      const r = replacedCount + extraReplaced;
      if (r > 0) parts.push(`${r} substituído${r === 1 ? "" : "s"}`);
      const sk = skippedCount + extraSkipped;
      if (sk > 0) parts.push(`${sk} pulado${sk === 1 ? "" : "s"}`);
      showToast(parts.join(" · "), "success");
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
    const classificationTags = classificacoesToTags(current.classificacao);
    const interestTags = (current.form.tags ?? []).filter(isInterestTag);

    const packageSelection: PackageSelection | null =
      current.packageProduct && sequenceEmailConfig?.sendKit
        ? {
            product_key: current.packageProduct,
            material_ids: current.packageMaterialIds,
            template_id: null,
          }
        : null;

    const payload: ContactData = {
      ...current.form,
      name: current.form.name.trim(),
      event_tag: current.form.event_tag?.trim() || null,
      tags: [...interestTags, ...classificationTags],
      ...(sequenceEmailConfig != null && {
        send_email: sequenceEmailConfig.sendKit,
        email_language: sequenceEmailConfig.language,
      }),
      ...(packageSelection && { package: packageSelection }),
    };

    const hasValidEmail = !!(
      payload.email &&
      payload.email.trim().length > 3 &&
      payload.email.includes("@")
    );
    if (sequenceEmailConfig?.sendKit && !hasValidEmail) {
      showToast(
        `${payload.name || "Contato"} salvo (sem e-mail — Mídia Kit não enviado)`,
        "info",
      );
    }

    const commitScan = async () => {
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
      await deletePendingScan(current.scan.id);
      setItems((prev) => prev.filter((_, idx) => idx !== currentIndex));
    };

    try {
      await saveContact(payload, current.scan.contact_id ?? undefined, false, { downloadVCard: false });
      await commitScan();
      setSavedCount((n) => n + 1);
      if (finishAfter || currentIndex >= items.length - 1) {
        finalize(1, 0, 0);
      }
    } catch (err) {
      if (err instanceof ApiConflictError) {
        const strategy = sequenceEmailConfig?.conflictStrategy ?? "ask";
        if (strategy === "replace" || strategy === "keep_both") {
          try {
            await saveContact(payload, current.scan.contact_id ?? undefined, true, { downloadVCard: false });
            await commitScan();
            setReplacedCount((n) => n + 1);
            showToast(`${payload.name} substituído (já existia)`, "info");
            if (finishAfter || currentIndex >= items.length - 1) {
              finalize(0, 1, 0);
            }
          } catch (forceErr) {
            console.error("[ReviewCarousel] force save failed:", forceErr);
            showToast(`Erro ao substituir ${payload.name}. Pulando.`, "error");
          }
        } else {
          // ask: exibe modal DuplicateModal existente
          setConflict(err.conflict);
          return;
        }
        return;
      }
      console.error("[ReviewCarousel] save failed:", err);
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
      if (currentIndex >= items.length - 1) finalize(1, 0, 0);
    } catch (err) {
      console.error("Erro no merge:", err);
      showToast("Falha ao mesclar contato. Tente novamente.", "error");
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
      if (currentIndex >= items.length - 1) finalize(1, 0, 0);
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
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0 || !current) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-app-bg px-6">
        <p className="text-lg text-slate-700">Nada pra revisar</p>
        <button
          onClick={onClose}
          className="mt-4 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white"
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
    <div className="min-h-screen bg-app-bg pb-32">
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
            className="h-full bg-accent transition-all duration-300"
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
            value={(current.form.tags ?? []).filter(isInterestTag)}
            onChange={(tags) => updateForm("tags", tags)}
          />
        </div>

        <ClassificacaoSection
          value={current.classificacao}
          onChange={updateClassificacao}
        />

        {/* Pacote de materiais por item */}
        {sequenceEmailConfig?.sendKit && materialsData && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted">Pacote</span>
                {current.packageProduct ? (
                  <span className="inline-flex items-center rounded-full bg-azul-noturno px-2 py-0.5 text-[11px] font-bold text-white">
                    {materialsData.products.find((p) => p.key === current.packageProduct)?.label ?? current.packageProduct}
                  </span>
                ) : (
                  <span className="text-xs text-text-subtle">Mídia Kit fixo (legado)</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="text-xs font-semibold text-laranja-360 underline"
              >
                Alterar
              </button>
            </div>
            {current.packageProduct && (
              <PackagePreviewText
                materialsData={materialsData}
                templatesData={templatesData}
                selectedProduct={current.packageProduct}
                selectedMaterialIds={current.packageMaterialIds}
                selectedLanguage={sequenceEmailConfig.language}
                contactName={current.form.name}
                eventTag={current.form.event_tag}
              />
            )}
          </div>
        )}

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
              className="mt-2 text-xs font-medium text-accent underline disabled:text-slate-300 disabled:no-underline"
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
              className="flex-[2] rounded-xl bg-primary py-3 text-base font-semibold text-white disabled:opacity-40 active:brightness-110 transition-colors"
              style={{ minHeight: 52 }}
            >
              {saving ? "Salvando..." : "Salvar e finalizar"}
            </button>
          ) : (
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !current.form.name?.trim()}
              className="flex-[2] rounded-xl bg-primary py-3 text-base font-semibold text-white disabled:opacity-40 active:brightness-110 transition-colors"
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

      {/* Modal / drawer de override do pacote por item */}
      {pickerOpen && materialsData && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
            <p className="text-base font-semibold text-slate-800">Alterar pacote</p>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <PackagePicker
              materialsData={materialsData}
              templatesData={templatesData}
              selectedProduct={current?.packageProduct ?? null}
              onProductChange={(product) => {
                const p = materialsData.products.find((pp) => pp.key === product);
                const materialIds = p ? defaultMaterialIds(p.groups, sequenceEmailConfig?.language ?? "pt-BR") : [];
                updateItemPackage(product, materialIds, true);
              }}
              selectedMaterialIds={current?.packageMaterialIds ?? []}
              onMaterialIdsChange={(ids) => {
                updateItemPackage(current?.packageProduct ?? null, ids, true);
              }}
              selectedLanguage={sequenceEmailConfig?.language ?? "pt-BR"}
              contactName={current?.form.name}
              eventTag={current?.form.event_tag}
              hidePreview
            />
          </div>
          <div className="border-t border-slate-200 bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-white active:brightness-110 transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
