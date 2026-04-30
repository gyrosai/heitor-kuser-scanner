export const ALLOWED_TAGS = [
  "Patrocínio",
  "Palestrante",
  "Parceria",
  "Cliente",
  "Mídia",
  "Follow-up",
] as const;

export type AllowedTag = (typeof ALLOWED_TAGS)[number];

export type Importance = 1 | 2 | 3 | null;

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
  incomplete?: boolean;
}

export interface ContactRecord extends ContactData {
  id: number;
  scanned_at: string;
  updated_at?: string | null;
  has_image: boolean;
  is_draft?: boolean;
  google_contact_id?: string | null;
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
