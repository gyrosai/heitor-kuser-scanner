"use client";

import { ClassificationCard, Section } from "@/components/ui";
import { ClassificacaoState } from "@/lib/types";
import { colors } from "@/lib/tokens";

interface ClassificacaoSectionProps {
  value: ClassificacaoState;
  onChange: (v: ClassificacaoState) => void;
}

export default function ClassificacaoSection({
  value,
  onChange,
}: ClassificacaoSectionProps) {
  return (
    <Section title="Classificação">
      <div className="flex flex-col gap-3">
        <ClassificationCard
          label="CIMI Invest"
          color={colors.brand.azulAtlantico}
          active={!!value.cimi_invest}
          onToggle={() =>
            onChange({
              ...value,
              cimi_invest: value.cimi_invest ? null : "parceria",
            })
          }
          options={["Parceria", "Venda"]}
          selected={value.cimi_invest ?? "parceria"}
          onSelect={(opt) =>
            onChange({ ...value, cimi_invest: opt as "parceria" | "venda" })
          }
        />
        <ClassificationCard
          label="CIMI 360"
          color={colors.brand.laranja360}
          active={!!value.cimi_360}
          onToggle={() =>
            onChange({
              ...value,
              cimi_360: value.cimi_360 ? null : "stand",
            })
          }
          options={["Stand", "Patrocinio"]}
          selected={value.cimi_360 ?? "stand"}
          onSelect={(opt) =>
            onChange({
              ...value,
              cimi_360: opt as "stand" | "patrocinio",
            })
          }
        />
      </div>
    </Section>
  );
}
