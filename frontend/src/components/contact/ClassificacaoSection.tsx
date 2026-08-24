"use client";

import { useEffect, useState } from "react";
import { ClassificationCard, Section } from "@/components/ui";
import {
  type Taxonomy,
  getTaxonomyCached,
  getProfileLabel,
  isLegacyProfile,
} from "@/lib/taxonomy";
import { type ClassificacaoState } from "@/lib/types";
import { colors } from "@/lib/tokens";

interface ClassificacaoSectionProps {
  value: ClassificacaoState;
  onChange: (v: ClassificacaoState) => void;
}

const PRODUCT_COLORS: Record<string, string> = {
  cimi_360: colors.brand.laranja360,
  cimi_invest: colors.brand.azulAtlantico,
  leilao: "#8B5CF6", // violet
  indip: "#059669", // emerald
  feirao: "#DC2626", // red
};

function getColor(key: string): string {
  return PRODUCT_COLORS[key] || colors.brand.azulNoturno;
}

export default function ClassificacaoSection({
  value,
  onChange,
}: ClassificacaoSectionProps) {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);

  useEffect(() => {
    getTaxonomyCached().then(setTaxonomy).catch(() => {
      // fallback já é tratado em getTaxonomyCached
    });
  }, []);

  if (!taxonomy) return null;

  return (
    <Section title="Classificação">
      <div className="flex flex-col gap-3">
        {taxonomy.products.map((product) => {
          const key = product.key;
          const currentSlug = value[key] ?? null;
          const isActive = currentSlug !== null;
          const isLegacy = currentSlug ? isLegacyProfile(taxonomy, key, currentSlug) : false;

          // Opções da UI: perfis atuais + legado se estiver selecionado
          const options = product.profiles.map((p) => p.slug);
          const effectiveOptions = isLegacy && currentSlug
            ? [...options, currentSlug]
            : options;

          const firstOption = product.profiles[0]?.slug ?? "";

          return (
            <ClassificationCard
              key={key}
              label={product.label}
              color={getColor(key)}
              active={isActive}
              onToggle={() =>
                onChange({
                  ...value,
                  [key]: isActive ? null : firstOption,
                })
              }
              options={effectiveOptions}
              selected={currentSlug ?? firstOption}
              onSelect={(opt) => onChange({ ...value, [key]: opt })}
              optionLabel={(slug) => {
                const label = getProfileLabel(taxonomy, key, slug);
                if (isLegacyProfile(taxonomy, key, slug)) {
                  return `${label ?? slug} (antigo)`;
                }
                return label ?? slug;
              }}
              disabledOption={(slug) =>
                isLegacyProfile(taxonomy, key, slug) && slug !== currentSlug
              }
            />
          );
        })}
      </div>
    </Section>
  );
}
