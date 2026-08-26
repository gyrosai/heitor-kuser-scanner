import rawTaxonomy from "./taxonomy.json";

// classificacoesToTags/tagsToClassificacoes: implementação única vive em
// ./taxonomy.ts (consciente da taxonomia real, incluindo perfis legados).
// Reexportadas aqui só por compatibilidade com imports existentes de "@/lib/types".
export { classificacoesToTags, tagsToClassificacoes } from "./taxonomy";

export const ALLOWED_TAGS: string[] = rawTaxonomy.interest_types;

export type Importance = 1 | 2 | 3 | null;

export type EmailLanguage = "pt-BR" | "en" | "es";

/** Estado de classificação: { product_key: slug | null } */
export type ClassificacaoState = Record<string, string | null>;

/**
 * Seleção de pacote de materiais para o e-mail pós-save. Ausente = mídia kit
 * fixo (comportamento legado, idêntico ao anterior). Espelha
 * backend/app/models.py::PackageSelection.
 */
export interface PackageSelection {
  product_key: string;
  material_ids: number[];
  template_id?: number | null;
}

export interface ContactData {
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  role: string | null;
  website: string | null;
  notes: string | null;
  source: "qrcode" | "card_photo" | "base_heitor";
  event_tag: string | null;
  importance: Importance;
  tags: string[];
  email_language: EmailLanguage;
  send_email?: boolean;
  incomplete?: boolean;
  package?: PackageSelection | null;
}

/** Último envio (e-mail, futuramente WhatsApp) registrado para o contato. */
export interface LastSend {
  channel: string;
  product_key: string | null;
  status: string;
  sent_at: string | null;
}

export interface ContactRecord extends ContactData {
  id: number;
  scanned_at: string;
  updated_at?: string | null;
  has_image: boolean;
  is_draft?: boolean;
  google_contact_id?: string | null;
  email_status?: "sent" | "failed" | "skipped" | null;
  email_sent_at?: string | null;
  email_error?: string | null;
  last_send?: LastSend | null;
  /** Marcadores originais do Google Contacts (só presente em source="base_heitor"). */
  import_labels?: string[];
}

/** Resposta paginada de GET /api/contacts?include_imported=true. */
export interface ContactListPage {
  contacts: ContactRecord[];
  total: number;
}

export interface ScanResponse {
  success: boolean;
  contact: ContactData | null;
  error: string | null;
  raw_data: string | null;
  contact_id?: number | null;
}

export interface TagInfo {
  tag: string;
  count: number;
}

export interface EventInfo {
  event_tag: string;
  count: number;
  last_scan: string | null;
}

export interface ConflictError {
  existing: ContactRecord;
  existing_id: number;
  new: ContactData;
  message?: string;
  /** "imported": veio da base do Heitor (source=base_heitor); "scanned": duplicata normal. */
  match_type?: "scanned" | "imported";
}

export class ApiConflictError extends Error {
  conflict: ConflictError;
  constructor(conflict: ConflictError) {
    super(conflict.message || "Contato duplicado detectado");
    this.name = "ApiConflictError";
    this.conflict = conflict;
  }
}

export interface BatchImageItem {
  local_id: string;
  image_base64: string;
}

export interface BatchScanRequest {
  images: BatchImageItem[];
}

export interface BatchResultItem {
  local_id: string;
  success: boolean;
  contact_id?: number | null;
  contact?: ContactData | null;
  error?: string | null;
}

export interface BatchScanResponse {
  results: BatchResultItem[];
}

/** Verifica se uma tag é de interesse (não é classificação de produto). */
export function isInterestTag(tag: string): boolean {
  const idx = tag.indexOf(":");
  if (idx === -1) return true;
  const key = tag.slice(0, idx);
  const knownProducts = new Set([
    ...rawTaxonomy.products.map((p: { key: string }) => p.key),
    ...Object.keys(rawTaxonomy.legacy_profiles || {}),
  ]);
  return !knownProducts.has(key);
}
