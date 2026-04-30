import {
  ApiConflictError,
  ContactData,
  ContactRecord,
  EventInfo,
  ScanResponse,
  TagInfo,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiBaseUrl = (): string => API_URL;

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail: unknown = null;
    try {
      const body = await res.json();
      detail = body?.detail ?? body;
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = null;
      }
    }
    const msg =
      typeof detail === "string"
        ? detail
        : `Erro ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function scanQRCode(imageBase64: string): Promise<ScanResponse> {
  const res = await fetch(`${API_URL}/api/scan/qrcode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageBase64 }),
  });
  return jsonOrThrow<ScanResponse>(res);
}

export async function scanCard(imageBase64: string): Promise<ScanResponse> {
  const res = await fetch(`${API_URL}/api/scan/card`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageBase64 }),
  });
  return jsonOrThrow<ScanResponse>(res);
}

export async function checkGoogleStatus(): Promise<{
  connected: boolean;
  email?: string;
}> {
  const res = await fetch(`${API_URL}/api/auth/google/status`);
  return res.json();
}

export function connectGoogle(): void {
  window.location.href = `${API_URL}/api/auth/google`;
}

export async function disconnectGoogle(): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/google/disconnect`, {
    method: "POST",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Falha ao desconectar (${res.status})`);
  }
}

export async function listContacts(params?: {
  event_tag?: string;
  min_importance?: number;
  tags?: string[];
  search?: string;
  include_drafts?: boolean;
}): Promise<ContactRecord[]> {
  const url = new URL(`${API_URL}/api/contacts`);
  if (params?.event_tag) url.searchParams.set("event_tag", params.event_tag);
  if (params?.min_importance != null)
    url.searchParams.set("min_importance", String(params.min_importance));
  if (params?.tags?.length) {
    for (const t of params.tags) url.searchParams.append("tags", t);
  }
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.include_drafts)
    url.searchParams.set("include_drafts", "true");

  const res = await fetch(url.toString());
  return jsonOrThrow<ContactRecord[]>(res);
}

export async function getContact(id: number): Promise<ContactRecord> {
  const res = await fetch(`${API_URL}/api/contacts/${id}`);
  return jsonOrThrow<ContactRecord>(res);
}

export async function listTags(): Promise<TagInfo[]> {
  const res = await fetch(`${API_URL}/api/contacts/tags`);
  return jsonOrThrow<TagInfo[]>(res);
}

export async function listEvents(): Promise<EventInfo[]> {
  const res = await fetch(`${API_URL}/api/contacts/events`);
  return jsonOrThrow<EventInfo[]>(res);
}

export async function updateContact(
  id: number,
  partial: Partial<ContactData>,
): Promise<ContactRecord> {
  const res = await fetch(`${API_URL}/api/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  return jsonOrThrow<ContactRecord>(res);
}

export async function deleteContact(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/contacts/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Falha ao deletar (${res.status})`);
  }
}

export async function mergeContact(
  id: number,
  data: ContactData,
): Promise<ContactRecord> {
  const res = await fetch(`${API_URL}/api/contacts/${id}/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return jsonOrThrow<ContactRecord>(res);
}

export async function syncContactToGoogle(
  id: number,
): Promise<{ google_contact_id: string; synced: boolean }> {
  const res = await fetch(`${API_URL}/api/contacts/${id}/sync-google`, {
    method: "POST",
  });
  return jsonOrThrow(res);
}

export function getContactImageUrl(id: number): string {
  return `${API_URL}/api/contacts/${id}/image`;
}

export function exportCSV(filters?: {
  event_tag?: string;
  min_importance?: number;
  tags?: string[];
}): void {
  const url = new URL(`${API_URL}/api/contacts/export.csv`);
  if (filters?.event_tag) url.searchParams.set("event_tag", filters.event_tag);
  if (filters?.min_importance != null)
    url.searchParams.set("min_importance", String(filters.min_importance));
  if (filters?.tags?.length) {
    for (const t of filters.tags) url.searchParams.append("tags", t);
  }
  window.location.href = url.toString();
}

/**
 * Salva um contato (POST /api/vcard). Se contactId for fornecido e o backend
 * detectar duplicata, lança ApiConflictError (409). Caso contrário dispara o
 * download do vCard como antes.
 */
export async function saveContact(
  contact: ContactData,
  contactId?: number,
  force = false,
): Promise<void> {
  const url = new URL(`${API_URL}/api/vcard`);
  if (contactId != null) url.searchParams.set("contact_id", String(contactId));
  if (force) url.searchParams.set("force", "true");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact),
  });

  if (res.status === 409) {
    const body = await res.json().catch(() => ({}));
    const detail = body?.detail ?? body;
    throw new ApiConflictError({
      existing: detail.existing,
      existing_id: detail.existing_id,
      new: detail.new,
      message: detail.message,
    });
  }

  if (!res.ok) {
    let msg = `Erro ao salvar (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") msg = body.detail;
    } catch {}
    throw new Error(msg);
  }

  const text = await res.text();
  const blob = new Blob([text], { type: "text/x-vcard;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const newWindow = window.open(blobUrl, "_blank");
  if (!newWindow) {
    window.location.href = blobUrl;
  }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

/**
 * @deprecated Use saveContact. Mantido temporariamente caso algum chamador
 * antigo ainda esteja em runtime durante a transição.
 */
export async function downloadVCard(contact: ContactData): Promise<void> {
  return saveContact(contact);
}
