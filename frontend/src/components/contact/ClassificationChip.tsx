import clsx from 'clsx';
import { useEffect, useState } from 'react';
import {
  type Taxonomy,
  getTaxonomyCached,
  getProfileLabel,
} from '@/lib/taxonomy';

export interface ClassificationChipData {
  productKey: string;
  slug: string;
}

interface ClassificationChipProps {
  cls: ClassificationChipData;
}

const PRODUCT_COLORS: Record<string, string> = {
  cimi_360: '#01303F', // navy
  cimi_invest: '#36A8AD', // teal
  leilao: '#5B8DEF',
  indip: '#2E8B57',
  feirao: '#B5563C',
};

const PRODUCT_SHORT_LABELS: Record<string, string> = {
  cimi_360: '360',
  cimi_invest: 'Invest',
  leilao: 'Leilão',
  indip: 'INDIP',
  feirao: 'Feirão',
};

function getColor(key: string): string {
  return PRODUCT_COLORS[key] || '#01303F';
}

function getShortLabel(key: string): string {
  return PRODUCT_SHORT_LABELS[key] || key;
}

export function ClassificationChip({ cls }: ClassificationChipProps) {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);

  useEffect(() => {
    getTaxonomyCached().then(setTaxonomy).catch(() => {});
  }, []);

  const color = getColor(cls.productKey);
  const shortLabel = getShortLabel(cls.productKey);
  const profileLabel = taxonomy
    ? getProfileLabel(taxonomy, cls.productKey, cls.slug) ?? cls.slug
    : cls.slug;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-[5px] px-2 py-[3px] rounded-sm border text-[10.5px] font-bold text-azul-noturno tracking-[0.3px]',
      )}
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="uppercase">{shortLabel}</span>
      <span className="text-text-muted font-semibold">·</span>
      <span>{profileLabel}</span>
    </span>
  );
}
