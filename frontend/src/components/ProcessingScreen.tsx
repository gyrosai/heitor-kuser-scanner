"use client";

import { useEffect, useRef, useState } from "react";
import { scanBatch } from "@/lib/api";
import {
  listPendingScans,
  recoverStuckUploads,
  updatePendingScan,
  type PendingScan,
} from "@/lib/pendingScans";
import { useToast } from "./Toast";

interface ProcessingScreenProps {
  onClose: () => void;
  onDone: () => void;
}

const CHUNK_SIZE = 5;
const PARALLEL_CHUNKS = 2;

interface ScanRunState {
  id: string;
  status: PendingScan["status"];
  error?: string;
}

export default function ProcessingScreen({
  onClose,
  onDone,
}: ProcessingScreenProps) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ScanRunState[]>([]);
  const [completed, setCompleted] = useState(0);
  const [failed, setFailed] = useState(0);
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState<"loading" | "running" | "finished">(
    "loading",
  );
  const cancelRef = useRef(false);
  const startedRef = useRef(false);

  const updateItem = (id: string, partial: Partial<ScanRunState>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...partial } : it)),
    );
  };

  const runBatch = async (
    pending: PendingScan[],
  ): Promise<{ ok: number; err: number }> => {
    const chunks: PendingScan[][] = [];
    for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
      chunks.push(pending.slice(i, i + CHUNK_SIZE));
    }

    let ok = 0;
    let err = 0;

    const processChunk = async (chunk: PendingScan[]) => {
      if (cancelRef.current) return;

      // Marca uploading no IndexedDB e na UI.
      const uploadingAt = Date.now();
      await Promise.all(
        chunk.map((s) =>
          updatePendingScan(s.id, {
            status: "uploading",
            uploading_at: uploadingAt,
          }),
        ),
      );
      chunk.forEach((s) => updateItem(s.id, { status: "uploading" }));

      try {
        const resp = await scanBatch(
          chunk.map((s) => ({
            local_id: s.id,
            image_base64: s.image_base64,
          })),
        );
        for (const r of resp.results) {
          if (r.success && r.contact_id != null) {
            await updatePendingScan(r.local_id, {
              status: "processed",
              contact_id: r.contact_id,
              extracted_data: r.contact ?? undefined,
              uploading_at: undefined,
              error_message: undefined,
            });
            updateItem(r.local_id, { status: "processed", error: undefined });
            ok++;
          } else {
            const msg = r.error || "Erro desconhecido";
            await updatePendingScan(r.local_id, {
              status: "error",
              error_message: msg,
              uploading_at: undefined,
            });
            updateItem(r.local_id, { status: "error", error: msg });
            err++;
          }
          setCompleted((n) => n + 1);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro de rede";
        for (const s of chunk) {
          await updatePendingScan(s.id, {
            status: "error",
            error_message: msg,
            uploading_at: undefined,
          });
          updateItem(s.id, { status: "error", error: msg });
          err++;
          setCompleted((n) => n + 1);
        }
      }
    };

    for (let i = 0; i < chunks.length; i += PARALLEL_CHUNKS) {
      if (cancelRef.current) break;
      const wave = chunks.slice(i, i + PARALLEL_CHUNKS);
      await Promise.all(wave.map(processChunk));
    }

    setFailed(err);
    return { ok, err };
  };

  const start = async () => {
    setPhase("loading");
    setCompleted(0);
    setFailed(0);
    cancelRef.current = false;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      showToast("Sem internet. Conecte-se pra processar.", "error");
      onClose();
      return;
    }

    // Recovery primeiro: scans em "uploading" (de uma sessão anterior que
    // crashou) voltam pra "captured" antes de listar.
    await recoverStuckUploads();

    const pending = await listPendingScans({
      status: ["captured", "error"],
      includeImage: true,
    });

    if (pending.length === 0) {
      showToast("Nada pra processar", "info");
      onClose();
      return;
    }

    setItems(pending.map((s) => ({ id: s.id, status: s.status })));
    setPhase("running");

    const { err } = await runBatch(pending);
    setPhase("finished");
    setDone(true);
    if (err === 0 && !cancelRef.current) {
      showToast("Tudo processado! Bora revisar.", "success");
      onDone();
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const handleRetryErrors = async () => {
    const errored = await listPendingScans({
      status: "error",
      includeImage: true,
    });
    if (errored.length === 0) return;
    setDone(false);
    setPhase("running");
    setCompleted(0);
    setFailed(0);
    setItems(errored.map((s) => ({ id: s.id, status: s.status })));
    cancelRef.current = false;
    const { err } = await runBatch(errored);
    setPhase("finished");
    setDone(true);
    if (err === 0) {
      showToast("Erros resolvidos! Bora revisar.", "success");
      onDone();
    }
  };

  const total = items.length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC]">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <p className="text-base font-semibold text-slate-800">
          Processando cartões
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {phase === "loading" && "Carregando fila..."}
          {phase === "running" && `${completed} de ${total} processadas`}
          {phase === "finished" &&
            `Concluído: ${total - failed} OK, ${failed} com erro`}
        </p>
      </header>

      <div className="px-4 py-4">
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-[#FA6801] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-slate-500">{progress}%</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <div className="space-y-1">
          {items.map((it, idx) => (
            <RunRow key={it.id} idx={idx + 1} item={it} />
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 space-y-2 border-t border-slate-200 bg-white px-4 py-3">
        {!done && phase === "running" && (
          <button
            onClick={handleCancel}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium text-slate-600 active:bg-slate-50"
          >
            Cancelar (chunks em vôo terminam)
          </button>
        )}
        {done && failed > 0 && (
          <>
            <button
              onClick={handleRetryErrors}
              className="w-full rounded-xl bg-[#FA6801] py-[14px] text-base font-semibold text-white active:bg-[#E55D00] transition-colors"
              style={{ minHeight: 52 }}
            >
              Tentar novamente ({failed})
            </button>
            <button
              onClick={onDone}
              className="w-full rounded-xl border border-[#FA6801]/30 bg-white py-[14px] text-base font-semibold text-[#FA6801] active:bg-[#FFF3EB] transition-colors"
              style={{ minHeight: 52 }}
            >
              Pular erros e revisar
            </button>
          </>
        )}
        {done && failed === 0 && (
          <button
            onClick={onDone}
            className="w-full rounded-xl bg-[#FA6801] py-[14px] text-base font-semibold text-white active:bg-[#E55D00] transition-colors"
            style={{ minHeight: 52 }}
          >
            Revisar contatos
          </button>
        )}
        {phase === "loading" && (
          <p className="py-3 text-center text-sm text-slate-400">
            Preparando...
          </p>
        )}
      </div>
    </div>
  );
}

function RunRow({ idx, item }: { idx: number; item: ScanRunState }) {
  const STATUS_ICON: Record<PendingScan["status"], string> = {
    captured: "⏳",
    uploading: "⏫",
    processed: "✅",
    saved: "✅",
    error: "⚠️",
  };
  const STATUS_TEXT: Record<PendingScan["status"], string> = {
    captured: "Aguardando",
    uploading: "Enviando...",
    processed: "Processada",
    saved: "Salva",
    error: "Erro",
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-xs font-semibold text-slate-500">
        {idx}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700">
          {STATUS_ICON[item.status]} {STATUS_TEXT[item.status]}
        </p>
        {item.error && (
          <p className="truncate text-xs text-red-600">{item.error}</p>
        )}
      </div>
    </div>
  );
}

