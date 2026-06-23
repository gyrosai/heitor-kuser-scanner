"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { compressImageForUpload } from "@/lib/imageCompression";
import {
  addPendingScan,
  countByStatus,
  deletePendingScan,
  recoverStuckUploads,
} from "@/lib/pendingScans";
import { useToast } from "./Toast";
import CaptureHeader from "./scan/CaptureHeader";
import SequenceThumbStrip from "./scan/SequenceThumbStrip";

interface SequenceCaptureProps {
  onClose: () => void;
  onProcess: () => void;
  onOpenQueue: () => void;
}

interface Shot {
  id: string;
  dataUrl: string;
}

const MAX_RECENT_SHOTS = 5;

export default function SequenceCapture({
  onClose,
  onProcess,
  onOpenQueue,
}: SequenceCaptureProps) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [capturedCount, setCapturedCount] = useState(0);
  const [recentShots, setRecentShots] = useState<Shot[]>([]);

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
        console.error("Erro ao iniciar SequenceCapture:", e);
      }
    })();
  }, [showToast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    try {
      const base64 = await compressImageForUpload(file);
      const scan = await addPendingScan(base64);
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      setRecentShots((prev) =>
        [{ id: scan.id, dataUrl }, ...prev].slice(0, MAX_RECENT_SHOTS),
      );
      setCapturedCount((n) => n + 1);
    } catch (err) {
      console.error("Erro ao salvar foto:", err);
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar foto",
        "error",
      );
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await deletePendingScan(id);
      setRecentShots((prev) => prev.filter((s) => s.id !== id));
      setCapturedCount((n) => Math.max(0, n - 1));
    } catch (err) {
      console.error("Erro ao descartar foto:", err);
      showToast("Erro ao descartar foto", "error");
    }
  };

  const queueButton = (
    <button
      onClick={onOpenQueue}
      className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white active:opacity-70 transition-opacity"
    >
      Ver fila
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-azul-noturno">
      <CaptureHeader
        title="Em sequência"
        onClose={onClose}
        rightAction={queueButton}
      />

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <Camera size={64} className="mb-6 text-white/40" />

        <p className="mb-8 text-center text-sm text-white/70">
          Tire fotos rapidamente. Cada uma vai pra fila e será processada depois.
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
          className="w-full max-w-xs rounded-xl bg-laranja-360 py-5 text-lg font-semibold text-white active:opacity-80 transition-opacity"
          style={{ minHeight: 56 }}
        >
          📸 Tirar foto
        </button>

        {capturedCount > 0 && (
          <p className="mt-4 text-xs text-white/50">
            {capturedCount} foto{capturedCount === 1 ? "" : "s"} capturada{capturedCount === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <SequenceThumbStrip
        shots={recentShots}
        onProcess={onProcess}
        onRemove={handleRemove}
      />
    </div>
  );
}
