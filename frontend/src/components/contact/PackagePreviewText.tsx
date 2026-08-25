"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { EmailLanguage } from "@/lib/types";
import { MaterialsPayload, TemplatesPayload } from "@/lib/materials";
import { previewPackage } from "@/lib/package";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PackagePreviewTextProps {
  materialsData: MaterialsPayload;
  templatesData?: TemplatesPayload | null;
  selectedProduct: string | null;
  selectedMaterialIds: number[];
  selectedLanguage: EmailLanguage;
  contactName?: string;
  eventTag?: string | null;
}

export default function PackagePreviewText({
  materialsData,
  templatesData,
  selectedProduct,
  selectedMaterialIds,
  selectedLanguage,
  contactName,
  eventTag,
}: PackagePreviewTextProps) {
  const [open, setOpen] = useState(false);

  if (!selectedProduct) return null;

  const product = materialsData.products.find((p) => p.key === selectedProduct) ?? null;
  if (!product) return null;

  const template = templatesData?.templates?.find((t) => t.product_key === selectedProduct) ?? null;
  const preview = previewPackage({
    contactName,
    eventTag,
    productLabel: product.label,
    language: selectedLanguage,
    materialIds: selectedMaterialIds,
    materials: product.groups.flatMap((g) => g.items),
    templateBody: template?.body ?? null,
  });

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-semibold text-laranja-360"
      >
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {open ? "Ocultar preview" : "Ver preview do e-mail"}
      </button>
      {open && (
        <Card padding="sm">
          <p className="whitespace-pre-wrap text-xs text-text-default">{preview.text}</p>
        </Card>
      )}
    </div>
  );
}
