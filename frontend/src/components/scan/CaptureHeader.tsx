"use client";

interface CaptureHeaderProps {
  title: string;
  onClose: () => void;
  rightAction?: React.ReactNode;
}

export default function CaptureHeader({ title, onClose, rightAction }: CaptureHeaderProps) {
  return (
    <div className="flex items-center px-2 py-3 bg-black/40 backdrop-blur-sm shrink-0">
      <button
        onClick={onClose}
        aria-label="Fechar"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white active:opacity-70 transition-opacity"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <span className="flex-1 text-center text-base font-bold text-white">{title}</span>

      <div className="flex h-11 w-11 shrink-0 items-center justify-center">
        {rightAction}
      </div>
    </div>
  );
}
