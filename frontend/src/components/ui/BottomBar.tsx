import { ReactNode } from 'react';
import clsx from 'clsx';

interface BottomBarProps {
  children: ReactNode;
  className?: string;
}

export function BottomBar({ children, className }: BottomBarProps) {
  return (
    <div
      className={clsx(
        'sticky bottom-0 bg-white border-t border-border-default px-4 pt-3 pb-3.5 flex flex-col gap-1 shadow-bottom-bar',
        className
      )}
    >
      {children}
    </div>
  );
}
