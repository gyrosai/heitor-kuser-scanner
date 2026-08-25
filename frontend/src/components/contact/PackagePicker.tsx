"use client";

import { useState } from "react";
import { Card, Checkbox, Chip } from "@/components/ui";
import { EmailLanguage } from "@/lib/types";
import { MaterialsPayload, TemplatesPayload } from "@/lib/materials";
import { defaultMaterialIds, previewPackage } from "@/lib/package";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PackagePickerProps {
  materialsData: MaterialsPayload;
  templatesData?: TemplatesPayload | null;
  selectedProduct: string | null;
  onProductChange: (productKey: string | null) => void;
  selectedMaterialIds: number[];
  onMaterialIdsChange: (ids: number[]) => void;
  selectedLanguage: EmailLanguage;
  contactName?: string;
  eventTag?: string | null;
  /** Quando true, esconde o preview colapsável (útil quando o picker vive
   * dentro de um modal/drawer que já tem preview externo). */
  hidePreview?: boolean;
}

export default function PackagePicker({
  materialsData,
  templatesData,
  selectedProduct,
  onProductChange,
  selectedMaterialIds,
  onMaterialIdsChange,
  selectedLanguage,
  contactName,
  eventTag,
  hidePreview = false,
}: PackagePickerProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const product = materialsData.products.find((p) => p.key === selectedProduct) ?? null;
  const template = templatesData?.templates?.find((t) => t.product_key === selectedProduct) ?? null;

  const handleProductChange = (key: string | null) => {
    onProductChange(key);
    setPreviewOpen(false);
    if (!key) {
      onMaterialIdsChange([]);
      return;
    }
    const p = materialsData.products.find((pp) => pp.key === key);
    onMaterialIdsChange(p ? defaultMaterialIds(p.groups, selectedLanguage) : []);
  };

  const toggleMaterial = (id: number) => {
    onMaterialIdsChange(
      selectedMaterialIds.includes(id)
        ? selectedMaterialIds.filter((x) => x !== id)
        : [...selectedMaterialIds, id],
    );
  };

  const preview = product
    ? previewPackage({
        contactName,
        eventTag,
        productLabel: product.label,
        language: selectedLanguage,
        materialIds: selectedMaterialIds,
        materials: product.groups.flatMap((g) => g.items),
        templateBody: template?.body ?? null,
      })
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold text-text-muted mb-2">
          Produto (opcional — monta um pacote de materiais em vez do mídia kit fixo)
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip active={!selectedProduct} onClick={() => handleProductChange(null)}>
            Nenhum
          </Chip>
          {materialsData.products.map((p) => (
            <Chip
              key={p.key}
              active={selectedProduct === p.key}
              onClick={() => handleProductChange(p.key)}
            >
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      {product && (
        <Card padding="sm">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-text-muted">
              Materiais · {selectedMaterialIds.length}{" "}
              {selectedMaterialIds.length === 1 ? "item" : "itens"}
            </p>
            {product.groups.length === 0 && (
              <p className="text-xs text-text-subtle">
                Nenhum material cadastrado para este produto ainda.
              </p>
            )}
            {product.groups.map((group) => (
              <div key={group.name} className="flex flex-col gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-text-subtle">
                  {group.name}
                </p>
                {group.items.map((item) => (
                  <Checkbox
                    key={item.id}
                    checked={selectedMaterialIds.includes(item.id)}
                    onChange={() => toggleMaterial(item.id)}
                    label={item.label + (item.language ? ` (${item.language})` : "")}
                  />
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {preview?.usedGenericTemplate && (
        <p className="text-xs text-warning-fg">
          Este produto ainda não tem texto padrão — será usado o texto genérico.
        </p>
      )}

      {preview && !hidePreview && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            className="flex items-center gap-1 min-h-10 text-xs font-semibold text-laranja-360"
          >
            {previewOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {previewOpen ? "Ocultar preview" : "Ver preview do e-mail"}
          </button>
          {previewOpen && (
            <Card padding="sm">
              <p className="whitespace-pre-wrap text-xs text-text-default">{preview.text}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
