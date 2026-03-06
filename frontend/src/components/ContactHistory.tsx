"use client";

import { useEffect, useState } from "react";
import { ContactData } from "@/lib/types";
import { downloadVCard } from "@/lib/api";

interface StoredContact extends ContactData {
  savedAt: string;
}

const STORAGE_KEY = "heitor_scanner_contacts";

export function saveContact(contact: ContactData) {
  const stored: StoredContact[] = JSON.parse(
    sessionStorage.getItem(STORAGE_KEY) || "[]"
  );
  stored.unshift({ ...contact, savedAt: new Date().toISOString() });
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export default function ContactHistory() {
  const [contacts, setContacts] = useState<StoredContact[]>([]);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    const stored = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) || "[]"
    ) as StoredContact[];
    setContacts(stored);
  }, []);

  const handleDownload = async (contact: StoredContact, index: number) => {
    try {
      setDownloading(index);
      await downloadVCard(contact);
    } catch (err) {
      console.error("Erro ao baixar vCard:", err);
    } finally {
      setDownloading(null);
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 text-center">
        <p className="text-slate-500">Nenhum contato escaneado ainda</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500">Contatos recentes</h3>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-50 px-2 text-xs font-semibold text-indigo-600">
          {contacts.length}
        </span>
      </div>
      <div className="space-y-2">
        {contacts.map((contact, i) => (
          <button
            key={i}
            onClick={() => handleDownload(contact, i)}
            disabled={downloading === i}
            className="flex w-full items-center gap-3 rounded-2xl bg-white border border-slate-200 shadow-sm p-4 text-left active:bg-slate-50 transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
              {contact.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800">
                {contact.name || "Sem nome"}
              </p>
              <p className="truncate text-sm text-slate-500">
                {contact.company || contact.email || contact.phone || ""}
              </p>
            </div>
            <span className="text-xs text-slate-400">
              {new Date(contact.savedAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
