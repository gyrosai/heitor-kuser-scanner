import clsx from 'clsx';

interface DividerProps {
  inset?: boolean;
}

export function Divider({ inset = false }: DividerProps) {
  return <div className={clsx('h-px bg-border-default', inset && 'mx-5')} />;
}
