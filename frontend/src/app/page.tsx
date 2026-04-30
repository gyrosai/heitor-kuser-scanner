"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  ApiConflictError,
  ConflictError,
  ContactData,
} from "@/lib/types";
import {
  checkGoogleStatus,
  connectGoogle,
  disconnectGoogle,
  mergeContact,
  saveContact,
  scanCard,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import CardCapture from "@/components/CardCapture";
import ContactEditor from "@/components/ContactEditor";
import ContactHistory from "@/components/ContactHistory";
import ContactPreview, { LAST_EVENT_KEY } from "@/components/ContactPreview";
import DuplicateModal from "@/components/DuplicateModal";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

type AppState =
  | "home"
  | "scanning_qr"
  | "capturing_card"
  | "loading"
  | "preview"
  | "showing_duplicate"
  | "editing"
  | "success";

export default function Home() {
  const { showToast } = useToast();
  const [state, setState] = useState<AppState>("home");
  const [contact, setContact] = useState<ContactData | null>(null);
  const [contactId, setContactId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [conflict, setConflict] = useState<ConflictError | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkGoogleStatus()
      .then((status) => {
        setGoogleConnected(status.connected);
        setGoogleEmail(status.email);
      })
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected") === "true") {
      showToast("Google Contacts conectado com sucesso!", "success");
      setGoogleConnected(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("google_error")) {
      showToast("Erro ao conectar com Google. Tente novamente.", "error");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [showToast]);

  const handleQRScan = useCallback((scannedContact: ContactData, scannedId?: number) => {
    setContact(scannedContact);
    setContactId(scannedId ?? null);
    setState("preview");
  }, []);

  const handleCardCapture = async (imageBase64: string) => {
    setState("loading");
    try {
      const result = await scanCard(imageBase64);
      if (result.success && result.contact) {
        setContact(result.contact);
        setContactId(result.contact_id ?? null);
        setState("preview");
      } else {
        showToast(
          result.error || "Não foi possível extrair os dados do cartão",
          "error",
        );
        setState("home");
      }
    } catch (err) {
      console.error("Erro ao escanear cartão:", err);
      showToast(
        err instanceof Error ? err.message : "Erro de conexão com o servidor",
        "error",
      );
      setState("home");
    }
  };

  const performSave = useCallback(
    async (editedContact: ContactData, force: boolean) => {
      setSaving(true);
      try {
        await saveContact(editedContact, contactId ?? undefined, force);
        if (editedContact.event_tag) {
          try {
            localStorage.setItem(LAST_EVENT_KEY, editedContact.event_tag);
          } catch {}
        }
        setState("success");
        setHistoryKey((k) => k + 1);
        setTimeout(() => {
          setState("home");
          setContact(null);
          setContactId(null);
          setConflict(null);
        }, 1600);
      } catch (err) {
        if (err instanceof ApiConflictError) {
          setConflict(err.conflict);
          setState("showing_duplicate");
          return;
        }
        console.error("Erro ao salvar contato:", err);
        showToast(
          err instanceof Error ? err.message : "Erro ao salvar contato",
          "error",
        );
      } finally {
        setSaving(false);
      }
    },
    [contactId, showToast],
  );

  const handleSave = (editedContact: ContactData) => {
    setContact(editedContact);
    void performSave(editedContact, false);
  };

  const handleMerge = async () => {
    if (!conflict || !contact) return;
    setSaving(true);
    try {
      await mergeContact(conflict.existing_id, contact);
      if (contact.event_tag) {
        try {
          localStorage.setItem(LAST_EVENT_KEY, contact.event_tag);
        } catch {}
      }
      showToast("Contato atualizado com sucesso", "success");
      setHistoryKey((k) => k + 1);
      setState("home");
      setContact(null);
      setContactId(null);
      setConflict(null);
    } catch (err) {
      console.error("Erro ao mesclar contato:", err);
      showToast(
        err instanceof Error ? err.message : "Erro ao atualizar contato",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleForceCreate = () => {
    if (!contact) return;
    void performSave(contact, true);
  };

  const handleDuplicateCancel = () => {
    setConflict(null);
    setState("preview");
  };

  const handleReset = () => {
    setState("home");
    setContact(null);
    setContactId(null);
    setConflict(null);
  };

  const handleDisconnect = async () => {
    const ok = confirm(
      "Desconectar Google? Os contatos já salvos permanecem, mas novos scans não serão sincronizados até alguém reconectar.",
    );
    if (!ok) return;
    try {
      await disconnectGoogle();
      setGoogleConnected(false);
      setGoogleEmail(undefined);
      showToast("Google desconectado", "success");
    } catch (e) {
      console.error("Erro ao desconectar:", e);
      showToast("Erro ao desconectar do Google", "error");
    }
  };

  const handleOpenContact = (id: number) => {
    setEditingId(id);
    setState("editing");
  };

  const handleEditorClose = () => {
    setEditingId(null);
    setState("home");
  };

  const handleEditorSaved = () => {
    setEditingId(null);
    setHistoryKey((k) => k + 1);
    setState("home");
  };

  const handleEditorDeleted = () => {
    setEditingId(null);
    setHistoryKey((k) => k + 1);
    setState("home");
  };

  if (state === "scanning_qr") {
    return (
      <Scanner
        onScan={(c) => handleQRScan(c)}
        onClose={handleReset}
      />
    );
  }

  if (state === "capturing_card") {
    return <CardCapture onCapture={handleCardCapture} onClose={handleReset} />;
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#FA6801] border-t-transparent" />
        <p className="mt-4 text-lg text-slate-500">Analisando cartão...</p>
      </div>
    );
  }

  if (state === "preview" && contact) {
    return (
      <>
        {googleConnected && googleEmail && (
          <AccountBanner
            email={googleEmail}
            onSwitch={handleDisconnect}
            sticky
          />
        )}
        <ContactPreview
          contact={contact}
          contactId={contactId ?? undefined}
          onSave={handleSave}
          onReset={handleReset}
          saving={saving}
        />
      </>
    );
  }

  if (state === "showing_duplicate" && conflict && contact) {
    return (
      <DuplicateModal
        existing={conflict.existing}
        newContact={contact}
        onMerge={handleMerge}
        onForceCreate={handleForceCreate}
        onCancel={handleDuplicateCancel}
        busy={saving}
      />
    );
  }

  if (state === "editing" && editingId != null) {
    return (
      <ContactEditor
        contactId={editingId}
        onClose={handleEditorClose}
        onSaved={handleEditorSaved}
        onDeleted={handleEditorDeleted}
      />
    );
  }

  if (state === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
          <svg
            className="h-10 w-10 text-emerald-600"
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
        <p className="mt-4 text-xl font-semibold text-slate-800">
          Contato salvo!
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8 pb-20">
      {googleConnected && googleEmail && (
        <AccountBanner email={googleEmail} onSwitch={handleDisconnect} />
      )}

      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Heitor Scanner</h1>
        <p className="mt-1 text-sm text-slate-500">
          Escaneie contatos rapidamente
        </p>
      </header>

      <div className="space-y-4 mb-8">
        <button
          onClick={() => setState("scanning_qr")}
          className="flex w-full items-center gap-4 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm active:bg-slate-50 transition-colors"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EB]">
            <svg
              className="h-7 w-7 text-[#FA6801]"
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
            <p className="text-lg font-semibold text-slate-800">
              Escanear QR Code
            </p>
            <p className="text-sm text-slate-500">Aponte para um código QR</p>
          </div>
        </button>

        <button
          onClick={() => setState("capturing_card")}
          className="flex w-full items-center gap-4 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm active:bg-slate-50 transition-colors"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EB]">
            <svg
              className="h-7 w-7 text-[#FA6801]"
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
            <p className="text-lg font-semibold text-slate-800">
              Cartão de Visita
            </p>
            <p className="text-sm text-slate-500">
              Tire uma foto e extraia os dados
            </p>
          </div>
        </button>
      </div>

      {!googleConnected && (
        <div className="mb-8 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 mb-3">
              <svg
                className="h-6 w-6 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-800">
              Google Contacts
            </p>
            <p className="mt-1 text-sm text-slate-500 mb-4">
              Conecte para salvar contatos automaticamente na sua agenda
            </p>
            <button
              onClick={connectGoogle}
              className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-shadow hover:shadow-md"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Conectar com Google
            </button>
          </div>
        </div>
      )}

      <ContactHistory
        refreshKey={historyKey}
        onOpenContact={handleOpenContact}
      />
    </div>
  );
}

function AccountBanner({
  email,
  onSwitch,
  sticky = false,
}: {
  email: string;
  onSwitch: () => void;
  sticky?: boolean;
}) {
  return (
    <div
      className={`${sticky ? "sticky top-0 z-20" : ""} mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center justify-between gap-3`}
    >
      <span className="truncate">
        💡 Salvando como: <span className="font-medium">{email}</span>
      </span>
      <button
        onClick={onSwitch}
        className="shrink-0 text-xs font-medium text-amber-900 underline"
      >
        Trocar conta
      </button>
    </div>
  );
}
