import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ContactData } from "./types";

export type ScanStatus =
  | "captured"
  | "uploading"
  | "processed"
  | "saved"
  | "error";

export interface PendingScan {
  id: string;
  image_base64: string;
  created_at: number;
  status: ScanStatus;
  contact_id?: number;
  extracted_data?: ContactData;
  error_message?: string;
  uploading_at?: number;
}

interface ScansDB extends DBSchema {
  pending_scans: {
    key: string;
    value: PendingScan;
    indexes: { "by-status": ScanStatus };
  };
}

const DB_NAME = "heitor_scanner_db";
const DB_VERSION = 1;
const STORE = "pending_scans";

let dbPromise: Promise<IDBPDatabase<ScansDB>> | null = null;

function getDB(): Promise<IDBPDatabase<ScansDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB indisponível em SSR"));
  }
  if (!dbPromise) {
    dbPromise = openDB<ScansDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("by-status", "status");
        }
      },
    });
  }
  return dbPromise;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function stripImage(scan: PendingScan): PendingScan {
  return { ...scan, image_base64: "" };
}

export async function addPendingScan(
  image_base64: string,
): Promise<PendingScan> {
  const db = await getDB();
  const scan: PendingScan = {
    id: newId(),
    image_base64,
    created_at: Date.now(),
    status: "captured",
  };
  try {
    await db.put(STORE, scan);
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      throw new Error(
        "Espaço de armazenamento cheio. Salve ou descarte fotos antigas.",
      );
    }
    throw e;
  }
  return scan;
}

export interface ListFilter {
  status?: ScanStatus | ScanStatus[];
  includeImage?: boolean;
}

export async function listPendingScans(
  filter: ListFilter = {},
): Promise<PendingScan[]> {
  const db = await getDB();
  const includeImage = filter.includeImage === true;

  let items: PendingScan[];
  if (filter.status) {
    const statuses = Array.isArray(filter.status)
      ? filter.status
      : [filter.status];
    const buckets = await Promise.all(
      statuses.map((s) => db.getAllFromIndex(STORE, "by-status", s)),
    );
    items = buckets.flat();
  } else {
    items = await db.getAll(STORE);
  }

  items.sort((a, b) => a.created_at - b.created_at);
  return includeImage ? items : items.map(stripImage);
}

export async function getPendingScan(
  id: string,
): Promise<PendingScan | undefined> {
  const db = await getDB();
  return db.get(STORE, id);
}

export async function updatePendingScan(
  id: string,
  partial: Partial<PendingScan>,
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
}

export async function deletePendingScan(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

export async function deleteAllSaved(): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(STORE, "readwrite");
  const idx = tx.store.index("by-status");
  let deleted = 0;
  let cursor = await idx.openCursor("saved");
  while (cursor) {
    await cursor.delete();
    deleted++;
    cursor = await cursor.continue();
  }
  await tx.done;
  return deleted;
}

const ALL_STATUSES: ScanStatus[] = [
  "captured",
  "uploading",
  "processed",
  "saved",
  "error",
];

export async function countByStatus(): Promise<Record<ScanStatus, number>> {
  const db = await getDB();
  const out: Record<ScanStatus, number> = {
    captured: 0,
    uploading: 0,
    processed: 0,
    saved: 0,
    error: 0,
  };
  await Promise.all(
    ALL_STATUSES.map(async (s) => {
      out[s] = await db.countFromIndex(STORE, "by-status", s);
    }),
  );
  return out;
}

const STUCK_UPLOAD_MS = 5 * 60 * 1000;

export async function recoverStuckUploads(): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(STORE, "readwrite");
  const idx = tx.store.index("by-status");
  const now = Date.now();
  let recovered = 0;
  let cursor = await idx.openCursor("uploading");
  while (cursor) {
    const scan = cursor.value;
    // Sem uploading_at é inconsistência (registro pré-recovery ou bug):
    // recupera por segurança.
    const startedAt = scan.uploading_at ?? scan.created_at;
    if (now - startedAt > STUCK_UPLOAD_MS) {
      await cursor.update({
        ...scan,
        status: "captured",
        uploading_at: undefined,
      });
      recovered++;
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return recovered;
}
