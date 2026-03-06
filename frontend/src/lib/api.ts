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

  const text = await res.text();
  const blob = new Blob([text], { type: "text/x-vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  // Tentar abrir em nova aba — no iOS isso abre o app Contatos
  const newWindow = window.open(url, "_blank");

  // Se popup foi bloqueado, navegar diretamente
  if (!newWindow) {
    window.location.href = url;
  }

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
