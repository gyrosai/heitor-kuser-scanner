"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { Banner, Button } from "@/components/ui";
import { useToast } from "@/components/Toast";
import {
  SAVE_QUEUE_EVENT,
  listPendingSaves,
  type PendingSave,
} from "@/lib/pendingSaves";
import { flushSaveQueue, isFlushAuthBlocked } from "@/lib/saveQueue";

// Banner persistente: contatos que falharam por rede e aguardam reenvio.
// Não some sozinho — só quando a fila esvaziar de fato.
export function PendingSavesBanner() {
  const { showToast } = useToast();
  const [items, setItems] = useState<PendingSave[]>([]);
  const [flushing, setFlushing] = useState(false);
  const [authBlocked, setAuthBlocked] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setItems(await listPendingSaves());
      setAuthBlocked(isFlushAuthBlocked());
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handler = () => {
      void refresh();
    };
    window.addEventListener(SAVE_QUEUE_EVENT, handler);
    return () => window.removeEventListener(SAVE_QUEUE_EVENT, handler);
  }, [refresh]);

  if (items.length === 0) return null;

  const n = items.length;
  const plural = n === 1 ? "" : "s";
  const struggling = items.some((i) => i.attempts > 3);
  const needsReview = items.filter((i) => i.needs_review).length;

  const handleFlush = async () => {
    setFlushing(true);
    try {
      const result = await flushSaveQueue();
      if (result.skipped) {
        showToast("Reenvio já em andamento...", "info");
      } else if (result.authBlocked) {
        showToast("Reconecte o Google para reenviar os contatos.", "error");
      } else if (result.ok > 0 && result.failed === 0) {
        showToast(
          `${result.ok} contato${result.ok === 1 ? "" : "s"} reenviado${result.ok === 1 ? "" : "s"} com sucesso.`,
          "success",
        );
      } else if (result.ok > 0) {
        showToast(
          `${result.ok} reenviado${result.ok === 1 ? "" : "s"}; ${result.failed} ainda pendente${result.failed === 1 ? "" : "s"}.`,
          "info",
        );
      } else {
        showToast(
          "Não foi possível reenviar agora. Tentaremos de novo automaticamente.",
          "error",
        );
      }
    } finally {
      setFlushing(false);
      void refresh();
    }
  };

  return (
    <div className="px-5 pt-[14px]">
      <Banner
        variant="warning"
        icon={<CloudOff size={18} className="text-warning-fg" />}
        title={
          authBlocked
            ? `${n} contato${plural} aguardando reconexão do Google`
            : `${n} contato${plural} aguardando envio`
        }
        description={
          needsReview > 0
            ? `${needsReview} excedeu o limite de tentativas automáticas — use "Reenviar agora" ou verifique sua conexão.`
            : struggling
              ? "Várias tentativas de reenvio falharam. Verifique sua conexão."
              : "Serão reenviados automaticamente quando houver conexão."
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            loading={flushing}
            leftIcon={<RefreshCw size={13} />}
            onClick={() => void handleFlush()}
          >
            Reenviar agora
          </Button>
        }
      />
    </div>
  );
}
