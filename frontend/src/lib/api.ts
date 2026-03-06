import { ContactData, ScanResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function scanQRCode(imageBase64: string): Promise<ScanResponse> {
  const res = await fetch(`${API_URL}/api/scan/qrcode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageBase64 }),
  });
  if (!res.ok) throw new Error(`Erro no servidor: ${res.status}`);
  return res.json();
}

export async function scanCard(imageBase64: string): Promise<ScanResponse> {
  const res = await fetch(`${API_URL}/api/scan/card`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageBase64 }),
  });
  if (!res.ok) throw new Error(`Erro no servidor: ${res.status}`);
  return res.json();
}

export async function downloadVCard(contact: ContactData): Promise<void> {
  const res = await fetch(`${API_URL}/api/vcard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact),
  });
  if (!res.ok) throw new Error(`Erro ao gerar vCard: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${contact.name || "contato"}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
