"use client";

import { useEffect, useRef, useState } from "react";
import { ContactData } from "@/lib/types";
import CaptureHeader from "./scan/CaptureHeader";
import QrFrameGuide from "./scan/QrFrameGuide";

function parseVCard(text: string): Partial<ContactData> {
  const get = (key: string) => {
    const regex = new RegExp(`^${key}[;:](.+)$`, "im");
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };
  const rawName = get("FN") || get("N");
  let name = rawName;
  if (rawName && rawName.includes(";")) {
    const parts = rawName.split(";").filter(Boolean);
    name = parts.reverse().join(" ").trim();
  }
  return {
    name: name || "",
    phone: get("TEL"),
    email: get("EMAIL"),
    company: get("ORG"),
    role: get("TITLE"),
    website: get("URL"),
  };
}

function parseMECARD(text: string): Partial<ContactData> {
  const get = (key: string) => {
    const regex = new RegExp(`${key}:([^;]+)`);
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };
  return {
    name: get("N") || "",
    phone: get("TEL"),
    email: get("E"),
    company: get("ORG"),
    role: get("TITLE"),
    website: get("URL"),
  };
}

export function parseQRText(text: string): ContactData | null {
  let parsed: Partial<ContactData> = {};

  if (text.startsWith("BEGIN:VCARD")) {
    parsed = parseVCard(text);
  } else if (text.startsWith("MECARD:")) {
    parsed = parseMECARD(text);
  } else if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      parsed = { website: text, name: url.hostname.replace("www.", "") };
    } catch {
      parsed = { website: text, name: text };
    }
  } else {
    const phoneMatch = text.match(/[\+]?[\d\s\-\(\)]{8,}/);
    const emailMatch = text.match(/[\w.\-]+@[\w.\-]+\.\w+/);
    if (phoneMatch || emailMatch) {
      parsed = {
        name: "",
        phone: phoneMatch ? phoneMatch[0].trim() : null,
        email: emailMatch ? emailMatch[0] : null,
      };
    }
  }

  if (!parsed.name && !parsed.phone && !parsed.email && !parsed.website) {
    return null;
  }

  return {
    name: parsed.name || "",
    phone: parsed.phone || null,
    email: parsed.email || null,
    company: parsed.company || null,
    role: parsed.role || null,
    website: parsed.website || null,
    notes: null,
    source: "qrcode",
    event_tag: null,
    importance: null,
    tags: [],
    email_language: "pt-BR",
    incomplete: !parsed.name,
  };
}

interface ScannerProps {
  onScan: (contact: ContactData, rawText: string) => void;
  onClose: () => void;
}

export default function Scanner({ onScan, onClose }: ScannerProps) {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const elementId = "qr-reader";
    let cancelled = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;
      let stopped = false;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            if (stopped) return;
            stopped = true;
            scanner.stop().catch(() => {});

            if (navigator.vibrate) navigator.vibrate(200);

            const contact = parseQRText(decodedText);
            if (contact) {
              onScan(contact, decodedText);
            } else {
              onScan(
                {
                  name: "",
                  phone: null,
                  email: null,
                  company: null,
                  role: null,
                  website: null,
                  notes: decodedText,
                  source: "qrcode",
                  event_tag: null,
                  importance: null,
                  tags: [],
                  email_language: "pt-BR",
                  incomplete: true,
                },
                decodedText
              );
            }
          },
          () => {}
        )
        .catch((err: any) => {
          console.error("Erro ao iniciar scanner:", err);
          setError("Não foi possível acessar a câmera. Verifique as permissões.");
        });
    });

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2 || state === 3) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {
          scannerRef.current.stop().catch(() => {});
        }
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <CaptureHeader title="QR Code" onClose={onClose} />

      <div className="relative flex-1">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
            <div className="rounded-2xl border border-danger-border bg-danger-bg p-6 text-center">
              <p className="text-danger-fg">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 rounded-xl bg-black/10 px-6 py-3 font-medium text-danger-fg active:opacity-80 transition-opacity"
                style={{ minHeight: 52 }}
              >
                Voltar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div id="qr-reader" className="absolute inset-0" />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <QrFrameGuide />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
