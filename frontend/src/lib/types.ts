export const ALLOWED_TAGS = [
  "Patrocínio",
  "Instrutor",
  "Parceria",
  "Cliente",
  "Mídia",
  "Follow-up",
] as const;

export type AllowedTag = (typeof ALLOWED_TAGS)[number];

export type Importance = 1 | 2 | 3 | null;

export type EmailLanguage = "pt-BR" | "en" | "es";

export type SubtipoInvest = "parceria" | "venda";
export type Subtipo360 = "stand" | "patrocinio";
export type ClassificacaoTag =
  | `cimi_invest:${SubtipoInvest}`
  | `cimi_360:${Subtipo360}`;

export type ClassificacaoState = {
  cimi_invest: SubtipoInvest | null;
  cimi_360: Subtipo360 | null;
};

export function classificacoesToTags(c: ClassificacaoState): ClassificacaoTag[] {
  const tags: ClassificacaoTag[] = [];
  if (c.cimi_invest) tags.push(`cimi_invest:${c.cimi_invest}`);
  if (c.cimi_360) tags.push(`cimi_360:${c.cimi_360}`);
  return tags;
}

export function tagsToClassificacoes(tags: string[]): ClassificacaoState {
  const state: ClassificacaoState = { cimi_invest: null, cimi_360: null };
  for (const tag of tags) {
    if (tag.startsWith("cimi_invest:")) {
      const sub = tag.slice("cimi_invest:".length) as SubtipoInvest;
      if (sub === "parceria" || sub === "venda") state.cimi_invest = sub;
    } else if (tag.startsWith("cimi_360:")) {
      const sub = tag.slice("cimi_360:".length) as Subtipo360;
      if (sub === "stand" || sub === "patrocinio") state.cimi_360 = sub;
    }
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
