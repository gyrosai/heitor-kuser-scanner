"use client";

import { useEffect, useRef, useState } from "react";
import { ContactData } from "@/lib/types";

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
  const containerRef = useRef<HTMLDivElement>(null);

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
        (decodedText) => {
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
        setError("Nao foi possivel acessar a camera. Verifique as permissoes.");
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
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold text-white">Escanear QR Code</h2>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        {error ? (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-xl bg-white/10 px-6 py-3 text-white"
              style={{ minHeight: 52 }}
            >
              Voltar
            </button>
          </div>
        ) : (
          <div className="relative w-full max-w-[320px]">
            <div
              id="qr-reader"
              ref={containerRef}
              className="overflow-hidden rounded-2xl"
            />
            <div className="pointer-events-none absolute inset-0 rounded-2xl">
              <div className="viewfinder-corner top-0 left-0" />
              <div className="viewfinder-corner top-0 right-0 rotate-90" />
              <div className="viewfinder-corner bottom-0 left-0 -rotate-90" />
              <div className="viewfinder-corner bottom-0 right-0 rotate-180" />
            </div>
          </div>
        )}
        <p className="mt-6 text-sm text-slate-400 text-center">
          Aponte a camera para o QR Code
        </p>
      </div>
    </div>
  );
}
