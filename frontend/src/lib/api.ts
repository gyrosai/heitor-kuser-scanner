import * as Sentry from "@sentry/nextjs";
import {
  ApiConflictError,
  BatchImageItem,
  BatchScanResponse,
  ContactData,
  ContactListPage,
  ContactRecord,
  EventInfo,
  PackageSelection,
  ScanResponse,
  TagInfo,
} from "./types";

const API_URL = ""; // chamadas relativas → Next.js rewrites encaminham pro backend

export const apiBaseUrl = (): string => API_URL;

/**
 * Erro RETRIÁVEL: a requisição pode ter sucesso se repetida mais tarde.
 * Cobre fetch rejeitado (rede caiu, DNS, timeout) e respostas transitórias
 * do servidor (5xx, 408, 429). Só este tipo entra na fila de retry offline.
 */
export class NetworkError extends Error {
  status?: number;
  /** 429 com Retry-After: quando o retry é permitido (ms a partir de agora) */
  retryAfterMs?: number;
  /** true = a requisição estourou o timeout (rede zumbi) */
  timedOut?: boolean;
  constructor(
    message: string,
    opts?: { status?: number; retryAfterMs?: number; timedOut?: boolean },
  ) {
    super(message);
    this.name = "NetworkError";
    this.status = opts?.status;
    this.retryAfterMs = opts?.retryAfterMs;
    this.timedOut = opts?.timedOut;
  }
}

/**
 * Erro LÓGICO (4xx exceto 409/408/429): repetir a mesma requisição não
 * resolve. Não deve entrar na fila de retry.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// /api/vcard faz update no DB + Google People + possível dispatch de email;
// 30s dá margem sem prender o usuário indefinidamente numa rede zumbi.
const MUTATION_TIMEOUT_MS = 30_000;
const READ_TIMEOUT_MS = 15_000;
// OCR com LLM pode legitimamente demorar — teto generoso só pra garantir que
// a tela de loading sempre termina, mesmo em rede zumbi.
const SCAN_TIMEOUT_MS = 90_000;
const BATCH_SCAN_TIMEOUT_MS = 180_000; // /batch processa até 10 imagens

/** true = browser tem AbortSignal.timeout nativo (Chrome 103+/Safari 16+) */
export function hasNativeAbortTimeout(): boolean {
  return (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  );
}

function timeoutSignal(ms: number): AbortSignal | undefined {
  if (hasNativeAbortTimeout()) {
    return AbortSignal.timeout(ms);
  }
  // Browsers antigos (o Android em campo pode ser um): fallback manual — o
  // abort chega como "TimeoutError" (ou "AbortError" se abort(reason) não
  // for suportado); ambos são classificados como timeout retriável.
  if (typeof AbortController !== "undefined") {
    const c = new AbortController();
    setTimeout(
      () => c.abort(new DOMException("TimeoutError", "TimeoutError")),
      ms,
    );
    return c.signal;
  }
  return undefined; // sem suporte: sem timeout, mas o app não quebra
}

// fetch que nunca rejeita com erro cru: rejeição (rede/DNS/timeout) vira NetworkError
async function doFetch(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  try {
    return await fetch(input, { ...init, signal: timeoutSignal(timeoutMs) });
  } catch (e) {
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    // TimeoutError = AbortSignal.timeout nativo · AbortError = fallback via
    // AbortController em browsers antigos. Os dois são timeout retriável.
    const timedOut =
      e instanceof DOMException &&
      (e.name === "TimeoutError" || e.name === "AbortError");
    throw new NetworkError(
      offline
        ? "Sem conexão com a internet."
        : timedOut
          ? "O servidor demorou demais para responder."
          : "Falha de rede ao comunicar com o servidor.",
      { timedOut },
    );
  }
}

function parseRetryAfter(res: Response): number | undefined {
  const header = res.headers.get("retry-after");
  if (!header) return undefined;
  const secs = Number(header);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

/**
 * Extrai uma mensagem legível do "detail" de uma resposta de erro.
 *
 * - string: usa direto (ex: HTTPException(detail="...")).
 * - array (formato padrão de erro de validação do FastAPI/Pydantic em 422):
 *   junta os "msg" de cada item, removendo o prefixo "Value error, " que o
 *   Pydantic v2 adiciona a exceções levantadas via @field_validator.
 * - qualquer outra coisa: mensagem genérica com o status.
 */
function extractErrorMessage(detail: unknown, status: number): string {
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail
      .map((item) => {
        const raw = (item as { msg?: unknown } | null)?.msg;
        return typeof raw === "string" ? raw.replace(/^Value error,\s*/, "") : null;
      })
      .filter((m): m is string => !!m);
    if (messages.length > 0) return messages.join("; ");
  }
  return `Erro ${status}`;
}

// Converte resposta não-ok em NetworkError (retriável) ou ApiError (lógico)
async function throwClassified(res: Response): Promise<never> {
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
  const msg = extractErrorMessage(detail, res.status);

  if (res.status >= 500 || res.status === 408 || res.status === 429) {
    throw new NetworkError(msg, {
      status: res.status,
      retryAfterMs: res.status === 429 ? parseRetryAfter(res) : undefined,
    });
  }

  if (res.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("oauth:expired"));
    // TODO: refinar pra distinguir 401 OAuth de outros 401 internos se necessário
  }
  throw new ApiError(msg, res.status);
}

// new URL() precisa de URL absoluta; quando API_URL é vazio usamos a origem do browser
function mkUrl(path: string): URL {
  const base = API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  return new URL(`${base}${path}`);
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) await throwClassified(res);
  return res.json() as Promise<T>;
}

export async function scanQRCode(imageBase64: string): Promise<ScanResponse> {
  const res = await doFetch(
    `${API_URL}/api/scan/qrcode`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 }),
    },
    SCAN_TIMEOUT_MS,
  );
  return jsonOrThrow<ScanResponse>(res);
}

export async function scanCard(imageBase64: string): Promise<ScanResponse> {
  const res = await doFetch(
    `${API_URL}/api/scan/card`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 }),
    },
    SCAN_TIMEOUT_MS,
  );
  return jsonOrThrow<ScanResponse>(res);
}

// Os tipos Batch* e a função scanBatch espelham a rota POST /api/scan/batch do backend.
// NÃO confundir com o "modo Em sequência" do usuário — esse é só o conceito de UI/UX
// que dispara múltiplas chamadas /api/scan/card individuais (não /batch).
export async function scanBatch(
  items: BatchImageItem[],
): Promise<BatchScanResponse> {
  const res = await doFetch(
    `${API_URL}/api/scan/batch`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: items }),
    },
    BATCH_SCAN_TIMEOUT_MS,
  );
  return jsonOrThrow<BatchScanResponse>(res);
}

export type GoogleAuthStatus =
  | { authenticated: false }
  | {
      authenticated: true;
      user_email: string;
      user_name: string;
      scopes: string[];
      has_gmail_send: boolean;
    };

export async function checkGoogleStatus(): Promise<GoogleAuthStatus> {
  try {
    const res = await doFetch(
      `${API_URL}/api/auth/google/status`,
      { credentials: "include" },
      READ_TIMEOUT_MS,
    );
    if (!res.ok) return { authenticated: false };
    return res.json();
  } catch {
    return { authenticated: false };
  }
}

export function connectGoogle(): void {
  window.location.href = `${API_URL}/api/auth/google`;
}

export async function disconnectGoogle(): Promise<void> {
  const res = await doFetch(
    `${API_URL}/api/auth/google/disconnect`,
    { method: "POST", credentials: "include" },
    MUTATION_TIMEOUT_MS,
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(`Falha ao desconectar (${res.status})`);
  }
}

interface ListContactsParams {
  event_tag?: string;
  min_importance?: number;
  tags?: string[];
  search?: string;
  include_drafts?: boolean;
  include_imported?: boolean;
  limit?: number;
}

/**
 * GET /api/contacts.
 *
 * Contrato do backend (backend/app/routers/scan.py::list_contacts):
 * - include_imported=false (padrão): resposta é `ContactRecord[]` puro —
 *   contrato legado, mantido por compatibilidade.
 * - include_imported=true: resposta é `{contacts, total}` (paginada via
 *   `limit`) — usado pelo toggle "Base Heitor".
 *
 * Os overloads abaixo dão o tipo de retorno correto em cada chamada; NUNCA
 * remover o overload sem `include_imported` — é o caminho usado hoje pelo
 * HomeScreen sem o toggle.
 */
export async function listContacts(
  params?: Omit<ListContactsParams, "include_imported"> & { include_imported?: false },
): Promise<ContactRecord[]>;
export async function listContacts(
  params: Omit<ListContactsParams, "include_imported"> & { include_imported: true },
): Promise<ContactListPage>;
export async function listContacts(
  params?: ListContactsParams,
): Promise<ContactRecord[] | ContactListPage> {
  const url = mkUrl("/api/contacts");
  if (params?.event_tag) url.searchParams.set("event_tag", params.event_tag);
  if (params?.min_importance != null)
    url.searchParams.set("min_importance", String(params.min_importance));
  if (params?.tags?.length) {
    for (const t of params.tags) url.searchParams.append("tags", t);
  }
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.include_drafts)
    url.searchParams.set("include_drafts", "true");
  if (params?.include_imported)
    url.searchParams.set("include_imported", "true");
  if (params?.limit != null) url.searchParams.set("limit", String(params.limit));

  const res = await doFetch(
    url.toString(),
    { credentials: "include" },
    READ_TIMEOUT_MS,
  );
  if (params?.include_imported) {
    return jsonOrThrow<ContactListPage>(res);
  }
  return jsonOrThrow<ContactRecord[]>(res);
}

export async function getContact(id: number): Promise<ContactRecord> {
  const res = await doFetch(
    `${API_URL}/api/contacts/${id}`,
    { credentials: "include" },
    READ_TIMEOUT_MS,
  );
  return jsonOrThrow<ContactRecord>(res);
}

export async function listTags(): Promise<TagInfo[]> {
  const res = await doFetch(
    `${API_URL}/api/contacts/tags`,
    { credentials: "include" },
    READ_TIMEOUT_MS,
  );
  return jsonOrThrow<TagInfo[]>(res);
}

export async function listEvents(): Promise<EventInfo[]> {
  const res = await doFetch(
    `${API_URL}/api/contacts/events`,
    { credentials: "include" },
    READ_TIMEOUT_MS,
  );
  return jsonOrThrow<EventInfo[]>(res);
}

export async function updateContact(
  id: number,
  partial: Partial<ContactData>,
): Promise<ContactRecord> {
  const res = await doFetch(
    `${API_URL}/api/contacts/${id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    },
    MUTATION_TIMEOUT_MS,
  );
  return jsonOrThrow<ContactRecord>(res);
}

export async function deleteContact(id: number): Promise<void> {
  const res = await doFetch(
    `${API_URL}/api/contacts/${id}`,
    { method: "DELETE", credentials: "include" },
    MUTATION_TIMEOUT_MS,
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(`Falha ao deletar (${res.status})`);
  }
}

export async function mergeContact(
  id: number,
  data: ContactData,
  options?: {
    /**
     * id do draft (criado por /scan/card) que originou o conflito — o backend
     * apaga a linha após o merge pra não deixar draft órfão no banco.
     */
    discardDraftId?: number;
  },
): Promise<ContactRecord> {
  const url = mkUrl(`/api/contacts/${id}/merge`);
  if (options?.discardDraftId != null && options.discardDraftId !== id) {
    url.searchParams.set("discard_draft_id", String(options.discardDraftId));
  }
  const res = await doFetch(
    url.toString(),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    MUTATION_TIMEOUT_MS,
  );
  return jsonOrThrow<ContactRecord>(res);
}

export async function syncContactToGoogle(
  id: number,
): Promise<{ google_contact_id: string; synced: boolean }> {
  const res = await doFetch(
    `${API_URL}/api/contacts/${id}/sync-google`,
    { method: "POST", credentials: "include" },
    MUTATION_TIMEOUT_MS,
  );
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
  const url = mkUrl("/api/contacts/export.csv");
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
 * detectar duplicata, lança ApiConflictError (409).
 *
 * Por padrão NÃO dispara download de vCard — use { downloadVCard: true } nos
 * call-sites onde o download é comportamento esperado (ex: save de cartão
 * individual). O carrossel (modo Em sequência) não deve passar essa opção.
 */
export async function saveContact(
  contact: ContactData,
  contactId?: number,
  force = false,
  options?: { downloadVCard?: boolean },
): Promise<void> {
  const url = mkUrl("/api/vcard");
  if (contactId != null) url.searchParams.set("contact_id", String(contactId));
  if (force) url.searchParams.set("force", "true");

  let res: Response;
  try {
    res = await doFetch(
      url.toString(),
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contact),
      },
      MUTATION_TIMEOUT_MS,
    );
  } catch (err) {
    // Rede caiu/timeout no save: retriável (vai pra fila), mas queremos ver no Sentry
    Sentry.captureException(err, {
      level: "warning",
      tags: { flow: "save_contact" },
      extra: { contactId, force },
    });
    throw err;
  }

  // 409 é fluxo normal de duplicata (não captura no Sentry)
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
    try {
      await throwClassified(res);
    } catch (err) {
      Sentry.captureException(err, {
        level: err instanceof NetworkError ? "warning" : "error",
        tags: { flow: "save_contact" },
        extra: { contactId, force, status: res.status },
      });
      throw err;
    }
  }

  if (options?.downloadVCard === true) {
    const text = await res.text();
    const blob = new Blob([text], { type: "text/x-vcard;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const newWindow = window.open(blobUrl, "_blank");
    if (!newWindow) {
      window.location.href = blobUrl;
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  }
}

/**
 * @deprecated Use saveContact.
 */
export async function downloadVCard(contact: ContactData): Promise<void> {
  return saveContact(contact);
}

export interface EmailQuota {
  sender_email: string;
  used: number;
  limit: number;
  remaining: number;
}

export async function getEmailQuota(): Promise<EmailQuota | null> {
  try {
    const res = await doFetch(
      `${API_URL}/api/emails/quota`,
      { credentials: "include" },
      READ_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    return res.json() as Promise<EmailQuota>;
  } catch {
    return null;
  }
}

export async function sendMediaKit(
  contactId: number,
  opts?: { language?: string; force?: boolean; package?: PackageSelection | null },
): Promise<{ status: string; gmail_message_id?: string }> {
  const res = await doFetch(
    `${API_URL}/api/contacts/${contactId}/send-email`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: opts?.language ?? "pt-BR",
        force: opts?.force ?? false,
        package: opts?.package ?? null,
      }),
    },
    MUTATION_TIMEOUT_MS,
  );

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

    if (res.status === 409) throw new Error("E-mail já enviado para este contato.");
    if (res.status === 422) throw new Error("Este contato não tem endereço de e-mail.");
    if (res.status === 429) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("quota:exhausted"));
      }
      throw new Error("Cota de e-mails esgotada. Tente amanhã.");
    }
    if (res.status === 502) throw new Error("Falha ao enviar pelo Gmail. Tente novamente.");

    const msg = typeof detail === "string" ? detail : `Erro ${res.status}`;
    throw new Error(msg);
  }

  return res.json();
}

export interface ContactSendRecord {
  id: number;
  channel: string;
  product_key: string | null;
  material_ids: number[];
  template_id: number | null;
  language: string;
  subject: string;
  status: string;
  error: string | null;
  created_at: string | null;
  sent_at: string | null;
}

/** Histórico de envios (e-mail, futuramente WhatsApp) de um contato. */
export async function getContactSends(contactId: number): Promise<ContactSendRecord[]> {
  const res = await doFetch(
    `${API_URL}/api/contacts/${contactId}/sends`,
    { credentials: "include" },
    READ_TIMEOUT_MS,
  );
  const body = await jsonOrThrow<{ sends: ContactSendRecord[] }>(res);
  return body.sends;
}

export async function sendTestEmail(
  to: string,
  idioma: string = "pt-BR",
): Promise<{ status: string; gmail_message_id?: string; error?: string }> {
  const url = mkUrl("/api/emails/test");
  url.searchParams.set("to", to);
  url.searchParams.set("idioma", idioma);
  const res = await doFetch(
    url.toString(),
    { method: "POST", credentials: "include" },
    MUTATION_TIMEOUT_MS,
  );
  return jsonOrThrow(res);
}
