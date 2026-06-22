"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, Trash2, Clock, Check, AlertCircle, X } from "lucide-react";
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
import { AppHeader } from "./ui/AppHeader";
import { BottomBar } from "./ui/BottomBar";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Spinner } from "./ui/Spinner";

interface QueueScreenProps {
  onClose: () => void;
  onProcess: () => void;
  onContinueReview: () => void;
  onCapture: () => void;
}

type Tab = "captured" | "processed";

const TAB_LABELS: Record<Tab, string> = {
  captured: "Capturadas",
  processed: "Processadas",
};

export default function QueueScreen({
  onClose,
  onProcess,
  onContinueReview,
  onCapture,
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

  const actionablePending = counts.captured + counts.error;
  const totalPending = actionablePending + counts.uploading;
  const totalScans = totalPending + counts.processed;
  const isQueueEmpty = !loading && totalScans === 0;

  const headerSubtitle = (() => {
    if (isQueueEmpty || loading) return undefined;
    if (totalPending > 0 && counts.processed > 0)
      return `${totalPending} aguardando · ${counts.processed} processadas`;
    if (totalPending > 0) return `${totalPending} aguardando`;
    return `${counts.processed} processadas`;
  })();

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      {/* Etapa B — AppHeader do design system */}
      <AppHeader
        title="Fila de scans"
        subtitle={headerSubtitle}
        onBack={onClose}
        rightAction={
          selectionMode ? (
            <button
              type="button"
              onClick={handleExitSelectionMode}
              className="rounded-full bg-app-bg px-3 py-1.5 text-xs font-semibold text-text-muted"
            >
              Cancelar
            </button>
          ) : totalScans > 0 ? (
            <button
              type="button"
              aria-label="Selecionar para descartar"
              onClick={handleEnterSelectionMode}
              className="flex items-center justify-center w-11 h-11 rounded-full text-danger-fg hover:bg-danger-bg transition-colors"
            >
              <Trash2 size={18} strokeWidth={2} />
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Etapa C — Empty state quando fila totalmente vazia */}
        {isQueueEmpty && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-surface border border-border-default flex items-center justify-center mb-4">
              <Camera size={28} className="text-text-subtle" strokeWidth={1.8} />
            </div>
            <h2 className="text-base font-bold text-azul-noturno mb-2">Fila vazia</h2>
            <p className="text-sm text-text-muted mb-6 max-w-xs leading-relaxed">
              Use o modo Em sequência pra capturar várias fotos rapidamente. Elas ficam aqui aguardando processamento.
            </p>
            <Button variant="primary" leftIcon={<Camera size={16} />} onClick={onCapture}>
              Começar a capturar
            </Button>
          </div>
        )}

        {/* Etapa E — Tabs: só aparecem quando há fotos na fila */}
        {!isQueueEmpty && (
          <div className="bg-surface px-4 pt-3 pb-3 border-b border-border-default">
            <div className="bg-app-bg rounded-xl p-1 flex gap-1">
              {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
                const count = t === "captured" ? totalPending : counts.processed;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTab(t);
                      handleExitSelectionMode();
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                      tab === t
                        ? "bg-azul-noturno text-white"
                        : "text-text-muted"
                    }`}
                  >
                    {TAB_LABELS[t]}
                    <span
                      className={`text-xs font-bold rounded-full px-1.5 min-w-[18px] text-center ${
                        tab === t ? "bg-white/20 text-white" : "text-text-subtle"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Grid de fotos */}
        {!isQueueEmpty && (
          <div className="px-4 py-4">
            {loading ? (
              <div className="rounded-2xl bg-surface border border-border-default p-6 text-center text-text-muted">
                Carregando...
              </div>
            ) : scans.length === 0 ? (
              <div className="rounded-2xl bg-surface border border-border-default p-6 text-center text-text-muted">
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
        )}
      </div>

      {/* Etapa B — BottomBar: some completamente quando fila vazia */}
      {!isQueueEmpty && (
        <BottomBar>
          {selectionMode ? (
            <Button
              variant="destructive"
              fullWidth
              disabled={selected.size === 0}
              onClick={() => void handleDiscardSelected()}
            >
              Descartar selecionadas ({selected.size})
            </Button>
          ) : actionablePending > 0 ? (
            <>
              <Button variant="primary" fullWidth onClick={onProcess}>
                Processar {actionablePending} foto{actionablePending === 1 ? "" : "s"}
              </Button>
              <Button variant="ghost" fullWidth size="sm" onClick={onCapture}>
                Capturar mais
              </Button>
            </>
          ) : counts.processed > 0 ? (
            <Button variant="primary" fullWidth onClick={onContinueReview}>
              Continuar revisão
            </Button>
          ) : null}
        </BottomBar>
      )}

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
          onClick={() => (selectionMode ? onToggle(scan.id) : onOpen(scan))}
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

/* Etapa D — Badge do design system por status */
function StatusBadge({ status }: { status: ScanStatus }) {
  switch (status) {
    case "captured":
      return (
        <Badge variant="neutral" leftIcon={<Clock size={10} strokeWidth={2.2} />}>
          Aguardando
        </Badge>
      );
    case "uploading":
      return (
        <Badge variant="info" leftIcon={<Spinner size={10} />}>
          Enviando...
        </Badge>
      );
    case "processed":
      return (
        <Badge variant="success" leftIcon={<Check size={10} strokeWidth={2.4} />}>
          Pronto
        </Badge>
      );
    case "saved":
      return (
        <Badge variant="success" leftIcon={<Check size={10} strokeWidth={2.4} />}>
          Salva
        </Badge>
      );
    case "error":
      return (
        <Badge variant="danger" leftIcon={<AlertCircle size={10} strokeWidth={2.2} />}>
          Falhou
        </Badge>
      );
  }
}

/* Etapa D — ScanThumb: Camera lucide, ring-laranja-360, sem hex */
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
  const subtitle =
    scan.extracted_data?.name ||
    scan.extracted_data?.company ||
    formatTime(scan.created_at);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border-2 bg-surface p-2 transition-all ${
        selected
          ? "border-laranja-360 ring-2 ring-laranja-360 ring-offset-2"
          : "border-border-default"
      }`}
    >
      <Camera size={28} strokeWidth={1.5} className="text-text-subtle" />
      <p className="mt-1 line-clamp-2 text-center text-[10px] text-text-muted">
        {subtitle}
      </p>

      <div className="absolute bottom-0 left-0 right-0 bg-surface/90 px-1.5 py-0.5 flex justify-center">
        <StatusBadge status={scan.status} />
      </div>

      {selectionMode && (
        <div
          className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
            selected
              ? "border-laranja-360 bg-laranja-360 text-white"
              : "border-white bg-white/80"
          }`}
        >
          {selected && <Check size={14} strokeWidth={3} />}
        </div>
      )}

      {scan.status === "error" && scan.error_message && (
        <div className="absolute inset-x-0 top-0 truncate bg-danger-bg px-1.5 py-0.5 text-[9px] text-danger-fg">
          {scan.error_message}
        </div>
      )}
    </button>
  );
}

/* Etapa F — PreviewOverlay: X lucide, tokens, sem hex */
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
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X size={20} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => {
            const ok = confirm("Deletar esta foto?");
            if (ok) void onDelete();
          }}
          className="flex items-center gap-2 rounded-full bg-danger-fg px-4 py-2 text-sm font-semibold text-white active:opacity-80 transition-opacity"
        >
          <Trash2 size={14} strokeWidth={2} />
          Deletar
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
