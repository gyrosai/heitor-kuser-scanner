"use client";

import { useState, useCallback } from "react";
import { ContactData } from "@/lib/types";
import { scanCard, downloadVCard } from "@/lib/api";
import { saveContact } from "@/components/ContactHistory";
import Scanner from "@/components/Scanner";
import CardCapture from "@/components/CardCapture";
import ContactPreview from "@/components/ContactPreview";
import ContactHistory from "@/components/ContactHistory";

type AppState =
  | "home"
  | "scanning_qr"
  | "capturing_card"
  | "loading"
  | "preview"
  | "success";

export default function Home() {
  const [state, setState] = useState<AppState>("home");
  const [contact, setContact] = useState<ContactData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const handleQRScan = useCallback(
    (scannedContact: ContactData) => {
      setContact(scannedContact);
      setState("preview");
    },
    []
  );

  const handleCardCapture = async (imageBase64: string) => {
    setState("loading");
    setError(null);
    try {
      const result = await scanCard(imageBase64);
      if (result.success && result.contact) {
        setContact(result.contact);
        setState("preview");
      } else {
        setError(result.error || "Nao foi possivel extrair os dados do cartao");
        setState("home");
      }
    } catch (err) {
      console.error("Erro ao escanear cartao:", err);
      setError("Erro de conexao com o servidor");
      setState("home");
    }
  };

  const handleSave = async (editedContact: ContactData) => {
    saveContact(editedContact);
    try {
      await downloadVCard(editedContact);
    } catch (err) {
      console.error("Erro ao gerar vCard:", err);
    }
    setState("success");
    setHistoryKey((k) => k + 1);
    setTimeout(() => {
      setState("home");
      setContact(null);
    }, 2000);
  };

  const handleReset = () => {
    setState("home");
    setContact(null);
    setError(null);
  };

  if (state === "scanning_qr") {
    return <Scanner onScan={handleQRScan} onClose={handleReset} />;
  }

  if (state === "capturing_card") {
    return <CardCapture onCapture={handleCardCapture} onClose={handleReset} />;
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f1a] px-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="mt-4 text-lg text-slate-400">Extraindo dados...</p>
      </div>
    );
  }

  if (state === "preview" && contact) {
    return (
      <ContactPreview
        contact={contact}
        onSave={handleSave}
        onReset={handleReset}
      />
    );
  }

  if (state === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f1a] px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
          <svg
            className="h-10 w-10 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="mt-4 text-xl font-semibold text-white">
          Contato salvo!
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] px-4 py-8 pb-20">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">Heitor Scanner</h1>
        <p className="mt-1 text-sm text-slate-500">
          Escaneie QR Codes e cartoes de visita
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 text-center">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline"
          >
            Fechar
          </button>
        </div>
      )}

      <div className="space-y-4 mb-8">
        <button
          onClick={() => setState("scanning_qr")}
          className="flex w-full items-center gap-4 rounded-2xl bg-[#1a1a2e] border border-[#2a2a3e] p-6 active:bg-[#252540] transition-colors"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20">
            <svg
              className="h-7 w-7 text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
              />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-lg font-semibold text-white">QR Code</p>
            <p className="text-sm text-slate-500">
              Escaneie em tempo real com a camera
            </p>
          </div>
        </button>

        <button
          onClick={() => setState("capturing_card")}
          className="flex w-full items-center gap-4 rounded-2xl bg-[#1a1a2e] border border-[#2a2a3e] p-6 active:bg-[#252540] transition-colors"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20">
            <svg
              className="h-7 w-7 text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-lg font-semibold text-white">Cartao de Visita</p>
            <p className="text-sm text-slate-500">
              Tire uma foto e extraia os dados
            </p>
          </div>
        </button>
      </div>

      <ContactHistory key={historyKey} />
    </div>
  );
}
