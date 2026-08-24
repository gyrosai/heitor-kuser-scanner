// Retry automático da fila de saves (pendingSaves). Processa SEQUENCIALMENTE
// pra evitar rajada de 409 e sobrecarga; um lock de módulo impede dois flushes
// simultâneos (gatilhos: evento "online", mount da Home, botão do banner).
import * as Sentry from "@sentry/nextjs";
import { ApiConflictError } from "./types";
import { ApiError, NetworkError, mergeContact, saveContact } from "./api";
import {
  PendingSave,
  SAVE_QUEUE_EVENT,
  deletePendingSave,
  listPendingSaves,
  updatePendingSave,
} from "./pendingSaves";

// Acima disso o flush automático desiste do item (needs_review) — evita
// reciclar pra sempre um save que nunca vai passar.
const MAX_ATTEMPTS = 10;
const DEFAULT_RETRY_AFTER_MS = 60_000;

let flushing = false;
let authBlocked = false;
let scheduled: ReturnType<typeof setTimeout> | null = null;

/** true = último flush parou num 401; a fila aguarda reconexão do Google */
export function isFlushAuthBlocked(): boolean {
  return authBlocked;
}

export interface FlushResult {
  ok: number;
  failed: number;
  authBlocked: boolean;
  /** true = flush não rodou (outro já em andamento) */
  skipped: boolean;
}

type Outcome = "ok" | "failed" | "auth" | "abort";

export async function flushSaveQueue(): Promise<FlushResult> {
  const result: FlushResult = {
    ok: 0,
    failed: 0,
    authBlocked: false,
    skipped: false,
  };
  if (flushing) {
    result.skipped = true;
    return result;
  }
  flushing = true;
  if (scheduled) {
    clearTimeout(scheduled);
    scheduled = null;
  }
  try {
    const items = await listPendingSaves();
    for (const item of items) {
      if (item.needs_review) continue;
      const outcome = await flushOne(item);
      if (outcome === "ok") {
        result.ok++;
      } else if (outcome === "failed") {
        result.failed++;
      } else if (outcome === "auth") {
        result.failed++;
        result.authBlocked = true;
        authBlocked = true;
        break;
      } else {
        // "abort": rede indisponível — os itens restantes falhariam igual
        result.failed++;
        break;
      }
    }
    if (!result.authBlocked) authBlocked = false;
  } finally {
    flushing = false;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SAVE_QUEUE_EVENT));
    }
  }
  return result;
}

async function flushOne(item: PendingSave): Promise<Outcome> {
  Sentry.addBreadcrumb({
    category: "save_queue",
    message: "flush:attempt",
    data: {
      id: item.id,
      contact_id: item.contact_id,
      attempts: item.attempts,
    },
  });
  try {
    await saveContact(item.contact, item.contact_id, false);
    await deletePendingSave(item.id);
    Sentry.addBreadcrumb({
      category: "save_queue",
      message: "flush:saved",
      data: { id: item.id },
    });
    return "ok";
  } catch (err) {
    if (err instanceof ApiConflictError) {
      // No retry automático não dá pra perguntar ao usuário; merge é o
      // comportamento seguro: preserva dados dos dois lados sem duplicar.
      try {
        await mergeContact(err.conflict.existing_id, item.contact);
        await deletePendingSave(item.id);
        Sentry.addBreadcrumb({
          category: "save_queue",
          message: "flush:merged",
          data: { id: item.id, existing_id: err.conflict.existing_id },
        });
        return "ok";
      } catch (mergeErr) {
        return handleFailure(item, mergeErr);
      }
    }
    return handleFailure(item, err);
  }
}

async function handleFailure(
  item: PendingSave,
  err: unknown,
): Promise<Outcome> {
  // OAuth expirado: NÃO consome attempts nem descarta — o item fica na fila
  // até o usuário reconectar o Google (api.ts já disparou oauth:expired).
  if (err instanceof ApiError && err.status === 401) {
    Sentry.addBreadcrumb({
      category: "save_queue",
      message: "flush:auth_blocked",
      level: "warning",
      data: { id: item.id, contact_id: item.contact_id },
    });
    return "auth";
  }

  if (err instanceof NetworkError) {
    const attempts = item.attempts + 1;
    const exhausted = attempts > MAX_ATTEMPTS;
    await updatePendingSave(item.id, {
      attempts,
      last_attempt_at: Date.now(),
      last_error: err.message,
      needs_review: exhausted ? true : undefined,
    });
    if (exhausted) {
      Sentry.captureMessage("save_queue: item excedeu MAX_ATTEMPTS", {
        level: "error",
        extra: {
          id: item.id,
          contact_id: item.contact_id,
          last_error: err.message,
        },
      });
    }
    if (err.status === 429) {
      scheduleFlush(err.retryAfterMs ?? DEFAULT_RETRY_AFTER_MS);
    }
    return "abort";
  }

  // Erro lógico (4xx ≠ 409/401): retry não resolve — remove da fila e
  // registra no Sentry (precisamos saber que um contato foi descartado).
  Sentry.captureException(err, {
    level: "error",
    tags: { flow: "save_queue" },
    extra: {
      id: item.id,
      contact_id: item.contact_id,
      attempts: item.attempts,
      contact_name: item.contact.name,
    },
  });
  await deletePendingSave(item.id);
  return "failed";
}

function scheduleFlush(delayMs: number): void {
  if (scheduled) clearTimeout(scheduled);
  scheduled = setTimeout(() => {
    scheduled = null;
    void flushSaveQueue();
  }, delayMs);
}
