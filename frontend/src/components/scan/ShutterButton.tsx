"use client";

interface ShutterButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function ShutterButton({ onClick, disabled, loading }: ShutterButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      aria-label="Capturar foto"
      className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-white shadow-lg active:scale-95 disabled:opacity-50 transition-transform"
    >
      {loading ? (
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-laranja-360 border-t-transparent" />
      ) : (
        <div className="h-[60px] w-[60px] rounded-full border-4 border-laranja-360" />
      )}
    </button>
  );
}
