"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    },
    [],
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const colorClass =
    toast.type === "success"
      ? "bg-emerald-600 text-white"
      : toast.type === "error"
        ? "bg-red-600 text-white"
        : "bg-slate-800 text-white";

  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-xl px-5 py-3 text-sm font-medium shadow-lg ${colorClass}`}
    >
      {toast.message}
    </div>
  );
}
