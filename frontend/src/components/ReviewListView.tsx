"use client";

import { useEffect, useState } from "react";
import { listPendingScans, type PendingScan } from "@/lib/pendingScans";
import { useToast } from "./Toast";

interface ReviewListViewProps {
  onClose: () => void;
  onPick: (index: number) => void;
}

export default function ReviewListView({
  onClose,
  onPick,
}: ReviewListViewProps) {
  const { showToast } = useToast();
  const [scans, setScans] = useState<PendingScan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listPendingScans({
          status: "processed",
          includeImage: false,
        });
        if (!cancelled) setScans(data);
      } catch (e) {
        console.error("Erro ao listar:", e);
        if (!cancelled) showToast("Erro ao carregar lista", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app-bg">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          aria-label="Voltar"
        >
          ✕
        </button>
        <p className="text-base font-semibold text-slate-800">A revisar</p>
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-accent-soft px-2 text-xs font-semibold text-primary">
          {scans.length}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-400">
            Carregando...
          </div>
        ) : scans.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-500">
            Nenhum contato a revisar.
          </div>
        ) : (
          <div className="space-y-2">
            {scans.map((scan, idx) => (
              <ListRow
                key={scan.id}
                scan={scan}
                onClick={() => onPick(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ListRow({
  scan,
  onClick,
}: {
  scan: PendingScan;
  onClick: () => void;
}) {
  const data = scan.extracted_data;
  const name = data?.name?.trim() || "Sem nome";
  const initial = name[0]?.toUpperCase() || "?";

  return (
    <button
      onClick={onClick}
      className="flex w-full items-stretch gap-3 rounded-2xl bg-white border border-slate-200 shadow-sm p-3 text-left active:bg-slate-50 transition-colors"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-base font-semibold text-primary">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-800">{name}</p>
        {data?.company && (
          <p className="truncate text-sm text-slate-500">{data.company}</p>
        )}
        {data?.email && (
          <p className="truncate text-xs text-slate-400">{data.email}</p>
        )}
        {!data?.company && !data?.email && data?.phone && (
          <p className="truncate text-xs text-slate-400">{data.phone}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center text-xs font-medium text-accent">
        Revisar →
      </div>
    </button>
  );
}
