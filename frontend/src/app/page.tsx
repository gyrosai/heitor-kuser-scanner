"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  ApiConflictError,
  ConflictError,
  ContactData,
} from "@/lib/types";
import type { GoogleAuthStatus } from "@/lib/api";
import {
  EmailQuota,
  checkGoogleStatus,
  connectGoogle,
  disconnectGoogle,
  getEmailQuota,
  mergeContact,
  saveContact,
  scanCard,
} from "@/lib/api";
import { countByStatus } from "@/lib/pendingScans";
import { useToast } from "@/components/Toast";
import SequenceCapture from "@/components/BatchCapture";
import CardCapture from "@/components/CardCapture";
import ContactEditor from "@/components/ContactEditor";
import ContactPreview, { LAST_EVENT_KEY } from "@/components/ContactPreview";
import { HomeScreen } from "@/components/home/HomeScreen";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { OAuthExpiredScreen } from "@/components/auth/OAuthExpiredScreen";
import { AboutScreen } from "@/components/about/AboutScreen";
import { OfflineBanner } from "@/components/system/OfflineBanner";
import DuplicateModal from "@/components/DuplicateModal";
import ProcessingScreen from "@/components/ProcessingScreen";
import QueueScreen from "@/components/QueueScreen";
import ReviewCarousel from "@/components/ReviewCarousel";
import ReviewListView from "@/components/ReviewListView";
import pkg from "../../package.json";

const appVersion = pkg.version;

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

type AppState =
  | "home"
  | "about"
  | "scanning_qr"
  | "capturing_card"
  | "loading"
  | "preview"
  | "showing_duplicate"
  | "editing"
  | "success"
  | "sequence_capture"
  | "queue"
  | "processing"
  | "review_carousel"
  | "review_list";

export default function Home() {
  const { showToast } = useToast();
  const [state, setState] = useState<AppState>("home");
  const [contact, setContact] = useState<ContactData | null>(null);
  const [contactId, setContactId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [conflict, setConflict] = useState<ConflictError | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [googleStatus, setGoogleStatus] = useState<GoogleAuthStatus>({ authenticated: false });
  const [emailQuota, setEmailQuota] = useState<EmailQuota | null>(null);
  const [saving, setSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [oauthExpired, setOauthExpired] = useState(false);
  const [ocrFailed, setOcrFailed] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const c = await countByStatus();
      setPendingCount(
        c.captured + c.uploading + c.processed + c.error,
      );
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount, state]);

  useEffect(() => {
    if (googleStatus.authenticated) {
      getEmailQuota().then(setEmailQuota).catch(() => {});
    } else {
      setEmailQuota(null);
    }
  }, [googleStatus.authenticated]);

  useEffect(() => {
    checkGoogleStatus()
      .then((status) => setGoogleStatus(status))
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected") === "true") {
      setOauthExpired(false);
      showToast("Google Contacts conectado com sucesso!", "success");
      checkGoogleStatus().then(setGoogleStatus).catch(() => {});
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
    setCapturedDataUrl(`data:image/jpeg;base64,${imageBase64}`);
    setState("loading");
    try {
      const result = await scanCard(imageBase64);
      if (result.success && result.contact) {
        const c = result.contact;
        const failed = !c.name && !c.email && !c.phone && !c.company;
        setOcrFailed(failed);
        setContact(c);
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
    setCapturedDataUrl(null);
    setOcrFailed(false);
  };

  const handleRetakePhoto = () => {
    setOcrFailed(false);
    setState("capturing_card");
  };

  const handleDisconnect = async () => {
    const ok = confirm(
      "Desconectar Google? Os contatos já salvos permanecem, mas novos scans não serão sincronizados até alguém reconectar.",
    );
    if (!ok) return;
    try {
      await disconnectGoogle();
      setGoogleStatus({ authenticated: false });
      showToast("Google desconectado", "success");
    } catch (e) {
      console.error("Erro ao desconectar:", e);
      showToast("Erro ao desconectar do Google", "error");
    }
  };

  useEffect(() => {
    const handler = () => setOauthExpired(true);
    window.addEventListener("oauth:expired", handler);
    return () => window.removeEventListener("oauth:expired", handler);
  }, []);

  useEffect(() => {
    const handler = () => setEmailQuota((q) => q ? { ...q, remaining: 0 } : q);
    window.addEventListener("quota:exhausted", handler);
    return () => window.removeEventListener("quota:exhausted", handler);
  }, []);

  const handleLogin = () => {
    setAuthLoading(true);
    connectGoogle(); // window.location.href descarrega a página — setAuthLoading(false) nunca executa
  };

  const handleReconnect = () => {
    setOauthExpired(false);
    handleLogin();
  };

  const handleOpenAbout = () => setState("about");

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

  const renderContent = () => {
    if (oauthExpired) {
      return (
        <OAuthExpiredScreen
          onReconnect={handleReconnect}
          pendingCount={pendingCount}
        />
      );
    }

    if (!googleStatus.authenticated) {
      return <LoginScreen onLogin={handleLogin} loading={authLoading} />;
    }

    if (state === "about") {
      return (
        <AboutScreen
          onBack={() => setState("home")}
          version={appVersion}
          userName={googleStatus.user_name}
        />
      );
    }

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
        <ContactPreview
          contact={contact}
          contactId={contactId ?? undefined}
          capturedDataUrl={capturedDataUrl ?? undefined}
          senderEmail={
            googleStatus.authenticated ? googleStatus.user_email : undefined
          }
          quotaExhausted={emailQuota != null ? emailQuota.remaining <= 0 : false}
          ocrFailed={ocrFailed}
          onRetakePhoto={handleRetakePhoto}
          onSave={handleSave}
          onReset={handleReset}
          saving={saving}
        />
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
          senderEmail={
            googleStatus.authenticated ? googleStatus.user_email : undefined
          }
          quotaExhausted={
            emailQuota != null
              ? emailQuota.remaining <= 0
              : false
          }
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

    if (state === "sequence_capture") {
      return (
        <SequenceCapture
          onClose={() => {
            void refreshPendingCount();
            setState("home");
          }}
          onProcess={() => setState("processing")}
          onOpenQueue={() => setState("queue")}
        />
      );
    }

    if (state === "queue") {
      return (
        <QueueScreen
          onClose={() => {
            void refreshPendingCount();
            setState("home");
          }}
          onProcess={() => setState("processing")}
          onContinueReview={() => {
            setReviewIndex(0);
            setState("review_carousel");
          }}
          onCapture={() => setState("sequence_capture")}
        />
      );
    }

    if (state === "processing") {
      return (
        <ProcessingScreen
          onClose={() => {
            void refreshPendingCount();
            setState("queue");
          }}
          onDone={() => {
            setReviewIndex(0);
            setState("review_carousel");
          }}
        />
      );
    }

    if (state === "review_carousel") {
      return (
        <ReviewCarousel
          startIndex={reviewIndex}
          onClose={() => {
            void refreshPendingCount();
            setHistoryKey((k) => k + 1);
            setState("home");
          }}
          onOpenList={() => setState("review_list")}
        />
      );
    }

    if (state === "review_list") {
      return (
        <ReviewListView
          onClose={() => setState("review_carousel")}
          onPick={(idx) => {
            setReviewIndex(idx);
            setState("review_carousel");
          }}
        />
      );
    }

    return (
      <HomeScreen
        userName={googleStatus.user_name}
        quota={emailQuota}
        pendingCount={pendingCount}
        refreshKey={historyKey}
        onScanCartao={() => setState("capturing_card")}
        onScanQR={() => setState("scanning_qr")}
        onScanSequence={() => setState(pendingCount > 0 ? "queue" : "sequence_capture")}
        onSelectContact={handleOpenContact}
        onLogout={handleDisconnect}
        onAbout={handleOpenAbout}
      />
    );
  };

  return (
    <>
      <OfflineBanner pendingCount={pendingCount} />
      {renderContent()}
    </>
  );
}
