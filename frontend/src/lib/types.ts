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
  incomplete?: boolean;
}

export interface ScanResponse {
  success: boolean;
  contact: ContactData | null;
  error: string | null;
  raw_data: string | null;
}
