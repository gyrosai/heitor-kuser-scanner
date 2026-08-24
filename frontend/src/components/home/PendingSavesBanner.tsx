"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CloudOff, RefreshCw } from "lucide-react";
import { Banner, Button } from "@/components/ui";
import { useToast } from "@/components/Toast";
import {
  SAVE_QUEUE_EVENT,
  listPendingSaves,
  type PendingSave,
} from "@/lib/pendingSaves";
import { flushSaveQueue, isFlushAuthBlocked } from "@/lib/saveQueue";

interface PendingSavesBannerProps {
  /** Chamado quando o reenvio manual sobe pelo menos um contato */
  onFlushed?: () => void;
  /** Abre o contato no editor (usado pela ação de "precisa de revisão") */
  onOpenContact?: (id: number) => void;
}

// Banner persistente: contatos que falharam por rede e aguardam reenvio.
// Não some sozinho — só quando a fila esvaziar de fato.
export function PendingSavesBanner({
  onFlushed,
  onOpenContact,
}: PendingSavesBannerProps) {
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

  // needs_review = flush automático desistiu (rede esgotou tentativas OU o
  // backend rejeitou o payload com 422). Nenhum dos dois casos é reenviado
  // sozinho — por isso ficam num banner separado, sem o "Reenviar agora".
  const reviewItems = items.filter((i) => i.needs_review);
  const pendingItems = items.filter((i) => !i.needs_review);

  const n = pendingItems.length;
  const plural = n === 1 ? "" : "s";
  const struggling = pendingItems.some((i) => i.attempts > 3);

  const reviewN = reviewItems.length;
  const reviewPlural = reviewN === 1 ? "" : "s";
  const reviewTarget = reviewItems.find((i) => i.contact_id != null);

  const handleFlush = async () => {
    setFlushing(true);
    try {
      const result = await flushSaveQueue();
      if (result.ok > 0) onFlushed?.();
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
    <div className="px-5 pt-[14px] flex flex-col gap-2">
      {reviewN > 0 && (
        <Banner
          variant="danger"
          icon={<AlertCircle size={18} className="text-danger-fg" />}
          title={`${reviewN} contato${reviewPlural} precisa${reviewN === 1 ? "" : "m"} de revisão`}
          description={
            reviewTarget?.last_error ||
            "O backend rejeitou os dados salvos. Abra no editor pra corrigir."
          }
          actions={
            reviewTarget ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenContact?.(reviewTarget.contact_id!)}
              >
                Abrir no editor
              </Button>
            ) : undefined
          }
        />
      )}

      {n > 0 && (
        <Banner
          variant="warning"
          icon={<CloudOff size={18} className="text-warning-fg" />}
          title={
            authBlocked
              ? `${n} contato${plural} aguardando reconexão do Google`
              : `${n} contato${plural} aguardando envio`
          }
          description={
            struggling
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
      )}
    </div>
  );
}
