import rawTaxonomy from "./taxonomy.json";

export const ALLOWED_TAGS: string[] = rawTaxonomy.interest_types;

export type Importance = 1 | 2 | 3 | null;

export type EmailLanguage = "pt-BR" | "en" | "es";

/** Estado de classificação: { product_key: slug | null } */
export type ClassificacaoState = Record<string, string | null>;

export function classificacoesToTags(state: ClassificacaoState): string[] {
  const tags: string[] = [];
  for (const [key, slug] of Object.entries(state)) {
    if (slug) tags.push(`${key}:${slug}`);
  }
  return tags;
}

export function tagsToClassificacoes(tags: string[]): ClassificacaoState {
  const state: ClassificacaoState = {};
  for (const tag of tags) {
    const idx = tag.indexOf(":");
    if (idx === -1) continue;
    const key = tag.slice(0, idx);
    const slug = tag.slice(idx + 1);
    state[key] = slug;
  }
  return state;
}

export interface ContactData {
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  role: string | null;
  website: string | null;
  notes: string | null;
  source: "qrcode" | "card_photo";
  event_tag: string | null;
  importance: Importance;
  tags: string[];
  email_language: EmailLanguage;
  send_email?: boolean;
  incomplete?: boolean;
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
