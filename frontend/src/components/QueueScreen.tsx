"use client";

import { useCallback, useEffect, useState } from "react";
import {
  countByStatus,
  deletePendingScan,
  getPendingScan,
  listPendingScans,
  recoverStuckUploads,
  type PendingScan,
  type ScanStatus,
} from "@/lib/pendingScans";
import { useToast } from "./Toast";

interface QueueScreenProps {
  onClose: () => void;
  onProcess: () => void;
  onContinueReview: () => void;
}

type Tab = "captured" | "processed";

const TAB_LABELS: Record<Tab, string> = {
  captured: "Capturadas",
  processed: "Processadas",
};

const STATUS_LABELS: Partial<Record<ScanStatus, string>> = {
  captured: "📷 Aguardando",
  uploading: "⏫ Enviando",
  processed: "✏️ A revisar",
  saved: "✅ Salva",
  error: "⚠️ Erro",
};

const STATUS_COLOR: Record<ScanStatus, string> = {
  captured: "bg-slate-100 text-slate-600",
  uploading: "bg-blue-100 text-blue-700",
  processed: "bg-amber-100 text-amber-700",
  saved: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-700",
};

export default function QueueScreen({
  onClose,
  onProcess,
  onContinueReview,
}: QueueScreenProps) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("captured");
  const [scans, setScans] = useState<PendingScan[]>([]);
  const [counts, setCounts] = useState<Record<ScanStatus, number>>({
    captured: 0,
    uploading: 0,
    processed: 0,
    saved: 0,
    error: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewing, setPreviewing] = useState<PendingScan | null>(null);

  const tabStatuses = useCallback((t: Tab): ScanStatus[] => {
    if (t === "captured") return ["captured", "uploading", "error"];
    return ["processed"];
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [items, c] = await Promise.all([
        listPendingScans({ status: tabStatuses(tab), includeImage: false }),
        countByStatus(),
      ]);
      setScans(items);
      setCounts(c);
    } catch (e) {
      console.error("Erro ao listar fila:", e);
      showToast("Erro ao carregar fila", "error");
    } finally {
      setLoading(false);
    }
  }, [tab, tabStatuses, showToast]);

  useEffect(() => {
    void recoverStuckUploads().then((n) => {
      if (n > 0) showToast(`${n} foto(s) recuperada(s)`, "info");
    });
  }, [showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEnterSelectionMode = () => {
    setSelectionMode(true);
    setSelected(new Set());
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelected(new Set());
  };

  const handleDiscardSelected = async () => {
    if (selected.size === 0) return;
    const ok = confirm(`Descartar ${selected.size} foto(s)?`);
    if (!ok) return;
    try {
      await Promise.all(
        Array.from(selected).map((id) => deletePendingScan(id)),
      );
      showToast(`${selected.size} foto(s) descartada(s)`, "success");
      handleExitSelectionMode();
      await refresh();
    } catch (e) {
      console.error("Erro ao descartar:", e);
      showToast("Erro ao descartar fotos", "error");
    }
  };

  const handleOpenPreview = async (scan: PendingScan) => {
    try {
      const full = await getPendingScan(scan.id);
      if (full) setPreviewing(full);
    } catch (e) {
      console.error("Erro ao abrir preview:", e);
    }
  };

  const handleDeleteFromPreview = async () => {
    if (!previewing) return;
    try {
      await deletePendingScan(previewing.id);
      setPreviewing(null);
      await refresh();
    } catch (e) {
      console.error("Erro ao deletar:", e);
      showToast("Erro ao deletar foto", "error");
    }
  };

  const primaryAction = (() => {
    if (counts.processed > 0) {
      return { label: "✏️ Continuar revisão", action: onContinueReview };
    }
    if (counts.captured > 0 || counts.error > 0) {
      const n = counts.captured + counts.error;
      return {
        label: `🚀 Processar ${n} foto${n === 1 ? "" : "s"}`,
        action: onProcess,
      };
    }
    return null;
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC]">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
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
          <p className="text-base font-semibold text-slate-800">Fila de scans</p>
          {selectionMode ? (
            <button
              onClick={handleExitSelectionMode}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
            >
              Cancelar
            </button>
          ) : (
            <button
              onClick={handleEnterSelectionMode}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"
              aria-label="Selecionar"
            >
              🗑
            </button>
          )}
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Aguardando: <span className="font-semibold">{counts.captured + counts.error + counts.uploading}</span>
          {" · "}
          Processadas: <span className="font-semibold">{counts.processed}</span>
        </p>

        <div className="mt-3 flex gap-1 rounded-full bg-slate-100 p-1">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                handleExitSelectionMode();
              }}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        {loading ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-400">
            Carregando...
          </div>
        ) : scans.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-500">
            Nenhuma foto nesta aba
          </div>
        ) : (
          <ScanGrid
            scans={scans}
            selectionMode={selectionMode}
            selected={selected}
            onToggle={toggleSelect}
            onOpen={handleOpenPreview}
          />
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-white px-4 py-3">
        {selectionMode ? (
          <button
            onClick={handleDiscardSelected}
            disabled={selected.size === 0}
            className="w-full rounded-xl bg-red-600 py-[14px] text-base font-semibold text-white disabled:opacity-40 active:bg-red-700 transition-colors"
            style={{ minHeight: 52 }}
          >
            Descartar selecionadas ({selected.size})
          </button>
        ) : primaryAction ? (
          <button
            onClick={primaryAction.action}
            className="w-full rounded-xl bg-[#FA6801] py-[14px] text-base font-semibold text-white active:bg-[#E55D00] transition-colors"
            style={{ minHeight: 52 }}
          >
            {primaryAction.label}
          </button>
        ) : (
          <p className="py-3 text-center text-sm text-slate-400">
            Tire fotos no Modo Rajada
          </p>
        )}
      </div>

      {previewing && (
        <PreviewOverlay
          scan={previewing}
          onClose={() => setPreviewing(null)}
          onDelete={handleDeleteFromPreview}
        />
      )}
    </div>
  );
}

function ScanGrid({
  scans,
  selectionMode,
  selected,
  onToggle,
  onOpen,
}: {
  scans: PendingScan[];
  selectionMode: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (scan: PendingScan) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {scans.map((scan) => (
        <ScanThumb
          key={scan.id}
          scan={scan}
          selectionMode={selectionMode}
          selected={selected.has(scan.id)}
          onClick={() =>
            selectionMode ? onToggle(scan.id) : onOpen(scan)
          }
        />
      ))}
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ScanThumb({
  scan,
  selectionMode,
  selected,
  onClick,
}: {
  scan: PendingScan;
  selectionMode: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  // Não carrega imagem aqui (listPendingScans usou includeImage:false).
  // Tap abre preview que faz getPendingScan(id). Mantém RAM baixa em fila grande.
  const label = STATUS_LABELS[scan.status] ?? scan.status;
  const colorClass = STATUS_COLOR[scan.status];
  const subtitle =
    scan.extracted_data?.name ||
    scan.extracted_data?.company ||
    formatTime(scan.created_at);

  return (
    <button
      onClick={onClick}
      className={`relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border-2 bg-slate-50 p-2 transition-all ${
        selected
          ? "border-[#FA6801] ring-2 ring-[#FA6801]/30"
          : "border-slate-200"
      }`}
    >
      <svg
        className="h-8 w-8 text-slate-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"
        />
      </svg>
      <p className="mt-1 line-clamp-2 text-center text-[10px] text-slate-500">
        {subtitle}
      </p>

      <div
        className={`absolute bottom-0 left-0 right-0 truncate px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}
      >
        {label}
      </div>

      {selectionMode && (
        <div
          className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
            selected
              ? "border-[#FA6801] bg-[#FA6801] text-white"
              : "border-white bg-white/80"
          }`}
        >
          {selected && (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      )}

      {scan.status === "error" && scan.error_message && (
        <div className="absolute inset-x-0 top-0 truncate bg-red-600/80 px-1.5 py-0.5 text-[9px] text-white">
          {scan.error_message}
        </div>
      )}
    </button>
  );
}

function PreviewOverlay({
  scan,
  onClose,
  onDelete,
}: {
  scan: PendingScan;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="Fechar"
        >
          ✕
        </button>
        <button
          onClick={() => {
            const ok = confirm("Deletar esta foto?");
            if (ok) onDelete();
          }}
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white"
        >
          🗑 Deletar
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/jpeg;base64,${scan.image_base64}`}
          alt="Foto do cartão"
          className="max-h-full max-w-full object-contain"
        />
      </div>
    </div>
  );
}
