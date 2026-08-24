// Fila local de saves que falharam por rede (POST /api/vcard). Espelha o
// padrão de pendingScans.ts; a conexão com o DB vem de db.ts (ver aviso lá).
import type { ContactData } from "./types";
import { getDB, newId } from "./db";

const STORE = "pending_saves";

export interface PendingSave {
  id: string;
  contact: ContactData;
  // id do draft no backend — permite dedup no retry e substituição na fila
  contact_id?: number;
  created_at: number;
  last_attempt_at?: number;
  attempts: number;
  last_error?: string;
  // attempts esgotou MAX_ATTEMPTS: flush automático não tenta mais
  needs_review?: boolean;
}

// Componentes (banner de pendências) escutam este evento pra re-renderizar.
export const SAVE_QUEUE_EVENT = "savequeue:changed";

function notifyChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SAVE_QUEUE_EVENT));
  }
}

export async function enqueueSave(
  contact: ContactData,
  contactId?: number,
): Promise<PendingSave> {
  const db = await getDB();
  const tx = db.transaction(STORE, "readwrite");

  // Dedup por contact_id: reenfileirar o mesmo draft substitui o item antigo
  // (payload mais novo vence) em vez de duplicar o contato no retry.
  let existing: PendingSave | undefined;
  if (contactId != null) {
    const all = await tx.store.getAll();
    existing = all.find((s) => s.contact_id === contactId);
  }

  const item: PendingSave = existing
    ? {
        ...existing,
        contact,
        attempts: 0,
        last_error: undefined,
        needs_review: undefined,
      }
    : {
        id: newId(),
        contact,
        contact_id: contactId,
        created_at: Date.now(),
        attempts: 0,
      };

  await tx.store.put(item);
  await tx.done;
  notifyChange();
  return item;
}

export async function listPendingSaves(): Promise<PendingSave[]> {
  const db = await getDB();
  const items = await db.getAll(STORE);
  items.sort((a, b) => a.created_at - b.created_at);
  return items;
}

export async function updatePendingSave(
  id: string,
  partial: Partial<PendingSave>,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE, "readwrite");
  const existing = await tx.store.get(id);
  if (!existing) {
    await tx.done;
    return;
  }
  await tx.store.put({ ...existing, ...partial, id: existing.id });
  await tx.done;
  notifyChange();
}

export async function deletePendingSave(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
  notifyChange();
}

export async function countPendingSaves(): Promise<number> {
  const db = await getDB();
  return db.count(STORE);
}
