import clsx from 'clsx';

export interface ClassificationChipData {
  type: 'invest' | 'cimi360';
  sub: string;
}

interface ClassificationChipProps {
  cls: ClassificationChipData;
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  patrocinio: 'Patrocínio',
  parceria: 'Parceria',
  venda: 'Venda',
  stand: 'Stand',
};

export function ClassificationChip({ cls }: ClassificationChipProps) {
  const isInvest = cls.type === 'invest';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-[5px] px-2 py-[3px] rounded-sm border text-[10.5px] font-bold text-azul-noturno tracking-[0.3px]',
        isInvest
          ? 'bg-tint-atlantico-bg border-tint-atlantico-border'
          : 'bg-tint-laranja-bg border-tint-laranja-border',
      )}
    >
      <span
        className={clsx(
          'w-1.5 h-1.5 rounded-full shrink-0',
          isInvest ? 'bg-azul-atlantico' : 'bg-laranja-360',
        )}
      />
      <span className="uppercase">{isInvest ? 'Invest' : '360'}</span>
      <span className="text-text-muted font-semibold">·</span>
      <span>{CLASSIFICATION_LABELS[cls.sub] ?? cls.sub}</span>
    </span>
  );
}
