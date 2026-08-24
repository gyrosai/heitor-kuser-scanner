// Conexão ÚNICA com o IndexedDB do app. Todos os módulos que precisam do banco
// (pendingScans, pendingSaves) importam getDB daqui — nunca chamar openDB em
// outro lugar: dois openDB com versões diferentes no mesmo DB lançam VersionError
// e quebram o app inteiro.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PendingScan, ScanStatus } from "./pendingScans";
import type { PendingSave } from "./pendingSaves";

interface AppDB extends DBSchema {
  pending_scans: {
    key: string;
    value: PendingScan;
    indexes: { "by-status": ScanStatus };
  };
  pending_saves: {
    key: string;
    value: PendingSave;
  };
}

const DB_NAME = "heitor_scanner_db";
// v1: pending_scans (modo sequência) · v2: + pending_saves (fila de retry)
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB indisponível em SSR"));
  }
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      // Idempotente: os guards de contains() cobrem tanto quem vem da v1
      // (só cria pending_saves) quanto instalação nova (cria os dois).
      // createObjectStore de um store novo nunca toca nos dados dos existentes.
      upgrade(db) {
        if (!db.objectStoreNames.contains("pending_scans")) {
          const store = db.createObjectStore("pending_scans", {
            keyPath: "id",
          });
          store.createIndex("by-status", "status");
        }
        if (!db.objectStoreNames.contains("pending_saves")) {
          db.createObjectStore("pending_saves", { keyPath: "id" });
        }
      },
      blocked() {
        // Outra aba com o DB v1 aberto segura o upgrade — no PWA mobile
        // (aba única) não deve acontecer; logamos pra ter visibilidade.
        console.warn(
          "[db] Upgrade do IndexedDB bloqueado por outra aba aberta do app.",
        );
      },
    });
  }
  return dbPromise;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
