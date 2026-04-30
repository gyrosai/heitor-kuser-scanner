"use client";

import { useEffect, useRef, useState } from "react";
import { compressImageForUpload } from "@/lib/imageCompression";
import {
  addPendingScan,
  countByStatus,
  deletePendingScan,
  recoverStuckUploads,
  type PendingScan,
} from "@/lib/pendingScans";
import { useToast } from "./Toast";

interface BatchCaptureProps {
  onClose: () => void;
  onProcess: () => void;
  onOpenQueue: () => void;
}

const THUMB_TIMEOUT_MS = 2000;

export default function BatchCapture({
  onClose,
  onProcess,
  onOpenQueue,
}: BatchCaptureProps) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [capturedCount, setCapturedCount] = useState(0);
  const [lastCaptured, setLastCaptured] = useState<PendingScan | null>(null);
  const [thumbVisible, setThumbVisible] = useState(false);
  const thumbTimerRef = useRef<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const recovered = await recoverStuckUploads();
        if (recovered > 0) {
          showToast(
            `${recovered} foto(s) recuperada(s) de upload travado`,
            "info",
          );
        }
        const counts = await countByStatus();
        setCapturedCount(counts.captured);
      } catch (e) {
        console.error("Erro ao iniciar BatchCapture:", e);
      }
    })();
    return () => {
      if (thumbTimerRef.current) window.clearTimeout(thumbTimerRef.current);
    };
  }, [showToast]);

  const showThumbnail = (scan: PendingScan) => {
    if (thumbTimerRef.current) window.clearTimeout(thumbTimerRef.current);
    setLastCaptured(scan);
    setThumbVisible(true);
    thumbTimerRef.current = window.setTimeout(() => {
      setThumbVisible(false);
      setLastCaptured(null);
      thumbTimerRef.current = null;
    }, THUMB_TIMEOUT_MS);
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    try {
      const base64 = await compressImageForUpload(file);
      const scan = await addPendingScan(base64);
      setCapturedCount((n) => n + 1);
      showThumbnail(scan);
    } catch (err) {
      console.error("Erro ao salvar foto:", err);
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar foto",
        "error",
      );
    }
  };

  const handleDiscardLast = async () => {
    if (!lastCaptured) return;
    if (thumbTimerRef.current) {
      window.clearTimeout(thumbTimerRef.current);
      thumbTimerRef.current = null;
    }
    try {
      await deletePendingScan(lastCaptured.id);
      setCapturedCount((n) => Math.max(0, n - 1));
    } catch (err) {
      console.error("Erro ao descartar foto:", err);
      showToast("Erro ao descartar foto", "error");
    }
    setThumbVisible(false);
    setLastCaptured(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC]">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          aria-label="Voltar"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex flex-col items-center text-center">
          <p className="text-base font-semibold text-slate-800">
            Modo Rajada
          </p>
          <p className="text-xs text-slate-500">
            {capturedCount === 0
              ? "Nenhuma foto na fila"
              : `${capturedCount} foto${capturedCount === 1 ? "" : "s"} pendente${capturedCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          onClick={onOpenQueue}
          className="flex h-10 items-center justify-center rounded-full bg-slate-100 px-3 text-xs font-medium text-slate-600"
        >
          Ver fila
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <div className="flex h-32 w-32 items-center justify-center rounded-full border border-[#FA6801]/20 bg-[#FFF3EB]">
          <svg
            className="h-16 w-16 text-[#FA6801]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
        </div>

        <p className="text-center text-base text-slate-500">
          Tire foto de cada cartão.
          <br />
          Processe todas no fim do evento.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => inputRef.current?.click()}
          className="w-full max-w-xs rounded-xl bg-[#FA6801] py-5 text-lg font-semibold text-white transition-colors active:bg-[#E55D00]"
          style={{ minHeight: 56 }}
        >
          📸 Tirar foto
        </button>

        {capturedCount > 0 && (
          <button
            onClick={onProcess}
            className="w-full max-w-xs rounded-xl border border-[#FA6801]/30 bg-white py-4 text-base font-semibold text-[#FA6801] transition-colors active:bg-[#FFF3EB]"
            style={{ minHeight: 52 }}
          >
            Processar {capturedCount} foto{capturedCount === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {thumbVisible && lastCaptured && (
        <button
          onClick={handleDiscardLast}
          className="fixed bottom-6 right-6 z-50 flex h-24 w-24 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-white shadow-lg active:scale-95 transition-transform"
          aria-label="Descartar última foto"
          style={{
            backgroundImage: `url(data:image/jpeg;base64,${lastCaptured.image_base64})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="flex h-full w-full items-center justify-center bg-black/40 text-xs font-semibold text-white">
            🗑 Descartar
          </div>
        </button>
      )}
    </div>
  );
}
