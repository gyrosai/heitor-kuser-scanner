"use client";

import { useEffect, useRef, useState } from "react";
import {
  ClassificacaoState,
  ContactData,
  IdiomaEmail,
  Importance,
  classificacoesToTags,
  tagsToClassificacoes,
} from "@/lib/types";
import { apiBaseUrl } from "@/lib/api";
import CardImagePreview from "./CardImagePreview";
import Field from "./Field";
import StarRating from "./StarRating";
import TagChips from "./TagChips";

const LEGACY_EVENT_KEY = "heitor_scanner_last_event_tag";
export const LAST_EVENT_KEY = "cimi_leads_last_event_tag";

// Tags que NÃO são classificação CIMI (são do TagChips / interesse)
function isClassificationTag(tag: string) {
  return tag.startsWith("cimi_invest:") || tag.startsWith("cimi_360:");
}

interface ContactPreviewProps {
  contact: ContactData;
  contactId?: number;
  onSave: (contact: ContactData) => void;
  onReset: () => void;
  saving?: boolean;
  saveLabel?: string;
}

// ── Seção de Classificação ────────────────────────────────────────────────────

type SubtipoInvest = "parceria" | "venda";
type Subtipo360 = "stand" | "patrocinio";

function ClassificacaoSection({
  value,
  onChange,
}: {
  value: ClassificacaoState;
  onChange: (v: ClassificacaoState) => void;
}) {
  const toggleInvest = () =>
    onChange({ ...value, cimi_invest: value.cimi_invest ? null : "parceria" });
  const toggle360 = () =>
    onChange({ ...value, cimi_360: value.cimi_360 ? null : "stand" });

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-600">
        Classificação
      </label>

      {/* CIMI Invest */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={toggleInvest}
          className="flex items-center gap-2 min-h-[44px] text-slate-700"
        >
          <span
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              value.cimi_invest
                ? "bg-[#FA6801] border-[#FA6801]"
                : "border-slate-400 bg-white"
            }`}
          >
            {value.cimi_invest && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className="font-medium">CIMI Invest</span>
        </button>

        {value.cimi_invest && (
          <div className="ml-7 flex gap-4">
            {(["parceria", "venda"] as SubtipoInvest[]).map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => onChange({ ...value, cimi_invest: sub })}
                className="flex items-center gap-2 min-h-[44px] text-slate-700"
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    value.cimi_invest === sub
                      ? "border-[#FA6801]"
                      : "border-slate-400"
                  }`}
                >
                  {value.cimi_invest === sub && (
                    <span className="w-2 h-2 rounded-full bg-[#FA6801]" />
                  )}
                </span>
                <span className="capitalize">{sub}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CIMI 360 */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={toggle360}
          className="flex items-center gap-2 min-h-[44px] text-slate-700"
        >
          <span
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              value.cimi_360
                ? "bg-[#FA6801] border-[#FA6801]"
                : "border-slate-400 bg-white"
            }`}
          >
            {value.cimi_360 && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className="font-medium">CIMI 360</span>
        </button>

        {value.cimi_360 && (
          <div className="ml-7 flex gap-4">
            {(["stand", "patrocinio"] as Subtipo360[]).map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => onChange({ ...value, cimi_360: sub })}
                className="flex items-center gap-2 min-h-[44px] text-slate-700"
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    value.cimi_360 === sub
                      ? "border-[#FA6801]"
                      : "border-slate-400"
                  }`}
                >
                  {value.cimi_360 === sub && (
                    <span className="w-2 h-2 rounded-full bg-[#FA6801]" />
                  )}
                </span>
                <span className="capitalize">
                  {sub === "patrocinio" ? "Patrocínio" : "Stand"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Seção de Idioma do e-mail ─────────────────────────────────────────────────

function IdiomaEmailSection({
  value,
  onChange,
}: {
  value: IdiomaEmail;
  onChange: (v: IdiomaEmail) => void;
}) {
  const options: { code: IdiomaEmail; label: string }[] = [
    { code: "pt-BR", label: "PT" },
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-600">
        Idioma do e-mail
      </label>
      <div className="flex gap-3">
        {options.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            className={`px-4 py-2 rounded-lg min-w-[60px] min-h-[44px] font-medium transition-colors ${
              value === code
                ? "bg-[#FA6801] text-white"
                : "bg-gray-100 text-gray-700 active:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Seção de Áudio ────────────────────────────────────────────────────────────

type AudioState =
  | { status: "idle" }
  | { status: "recording"; startedAt: number }
  | { status: "processing" }
  | { status: "done"; transcricao: string }
  | { status: "error"; message: string };

function useTimer(active: boolean, startedAt: number) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      500
    );
    return () => clearInterval(id);
  }, [active, startedAt]);
  return elapsed;
}

function fmtTime(s: number) {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

function ObservacaoAudio({ onTranscribed }: { onTranscribed: (notes: string) => void }) {
  const [audio, setAudio] = useState<AudioState>({ status: "idle" });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startedAt =
    audio.status === "recording" ? audio.startedAt : 0;
  const elapsed = useTimer(audio.status === "recording", startedAt);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes("webm") ? "webm" : "ogg";
        const file = new File([blob], `audio.${ext}`, { type: mimeType });

        setAudio({ status: "processing" });

        try {
          const fd = new FormData();
          fd.append("audio", file);
          const res = await fetch(`${apiBaseUrl()}/api/transcribe`, { method: "POST", body: fd });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          setAudio({ status: "done", transcricao: data.notes });
          onTranscribed(data.notes);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setAudio({ status: "error", message: msg });
        }
      };

      recorder.start();
      setAudio({ status: "recording", startedAt: Date.now() });
    } catch {
      setAudio({ status: "error", message: "Permissão de microfone negada" });
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const reset = () => {
    stop();
    setAudio({ status: "idle" });
  };

  return (
    <div className="space-y-2">
      {audio.status === "idle" && (
        <button
          type="button"
          onClick={start}
          className="flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-700 active:bg-slate-50 transition-colors"
        >
          <span className="text-lg">🎤</span>
          <span className="text-sm font-medium">Gravar áudio</span>
        </button>
      )}

      {audio.status === "recording" && (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-red-600 font-medium text-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Gravando {fmtTime(elapsed)}
          </span>
          <button
            type="button"
            onClick={stop}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium active:bg-red-100 transition-colors"
          >
            ⏹ Parar
          </button>
        </div>
      )}

      {audio.status === "processing" && (
        <p className="text-sm text-slate-500 py-2">Transcrevendo...</p>
      )}

      {audio.status === "done" && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-green-600 font-medium">✓ Transcrição aplicada</span>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-600 text-sm active:bg-slate-50 transition-colors"
          >
            🎤 Regravar
          </button>
        </div>
      )}

      {audio.status === "error" && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-red-600">{audio.message}</span>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-600 text-sm active:bg-slate-50 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}

// ── ContactPreview principal ──────────────────────────────────────────────────

export default function ContactPreview({
  contact,
  contactId,
  onSave,
  onReset,
  saving = false,
  saveLabel = "Salvar Contato",
}: ContactPreviewProps) {
  // Tags de interesse (não-classificação)
  const interestTags = (contact.tags ?? []).filter((t) => !isClassificationTag(t));

  const [form, setForm] = useState<ContactData>({
    ...contact,
    importance: contact.importance ?? null,
    tags: interestTags,
    event_tag: contact.event_tag || "",
    idioma_email: contact.idioma_email ?? "pt-BR",
  });

  const [classificacao, setClassificacao] = useState<ClassificacaoState>(() =>
    tagsToClassificacoes(contact.tags ?? [])
  );

  useEffect(() => {
    try {
      let stored = localStorage.getItem(LAST_EVENT_KEY);
      if (!stored) {
        const legacy = localStorage.getItem(LEGACY_EVENT_KEY);
        if (legacy) {
          localStorage.setItem(LAST_EVENT_KEY, legacy);
          localStorage.removeItem(LEGACY_EVENT_KEY);
          stored = legacy;
        }
      }
      if (stored) {
        setForm((prev) => ({ ...prev, event_tag: prev.event_tag || stored }));
      }
    } catch {}
  }, []);

  const update = <K extends keyof ContactData>(field: K, value: ContactData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.name?.trim()) return;

    // Valida classificação: se checkbox marcado, subtipo é obrigatório (já garantido pelo toggle)
    const classificationTags = classificacoesToTags(classificacao);
    const allTags = [...(form.tags || []), ...classificationTags];

    const payload: ContactData = {
      ...form,
      name: form.name.trim(),
      event_tag: form.event_tag?.trim() || null,
      tags: allTags,
    };
    onSave(payload);
  };

  // Quando áudio transcreve, preenche notes
  const handleTranscribed = (notes: string) => {
    update("notes", notes);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 pb-12">
      <h2 className="mb-4 text-xl font-semibold text-slate-800 text-center">
        Dados do Contato
      </h2>

      {contactId != null && (
        <div className="mb-4">
          <CardImagePreview contactId={contactId} />
        </div>
      )}

      {contact.incomplete && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 text-center">
          Alguns dados podem estar incompletos
        </div>
      )}

      <div className="space-y-4">
        <Field
          label="Nome *"
          value={form.name || ""}
          onChange={(v) => update("name", v)}
          required
        />
        <Field
          label="Telefone"
          value={form.phone || ""}
          onChange={(v) => update("phone", v)}
          type="tel"
        />
        <Field
          label="Email"
          value={form.email || ""}
          onChange={(v) => update("email", v)}
          type="email"
        />
        <Field
          label="Empresa"
          value={form.company || ""}
          onChange={(v) => update("company", v)}
        />
        <Field
          label="Cargo"
          value={form.role || ""}
          onChange={(v) => update("role", v)}
        />
        <Field
          label="Website"
          value={form.website || ""}
          onChange={(v) => update("website", v)}
          type="url"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Importância
          </label>
          <StarRating
            value={form.importance as Importance}
            onChange={(v) => update("importance", v)}
            size="lg"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Tipo de interesse
          </label>
          <TagChips
            value={form.tags || []}
            onChange={(tags) => update("tags", tags)}
          />
        </div>

        {/* Classificação CIMI */}
        <ClassificacaoSection value={classificacao} onChange={setClassificacao} />

        {/* Idioma do e-mail */}
        <IdiomaEmailSection
          value={form.idioma_email}
          onChange={(v) => update("idioma_email", v)}
        />

        {/* Áudio + Observações */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600">
            Observações
          </label>
          <ObservacaoAudio onTranscribed={handleTranscribed} />
          <textarea
            value={form.notes || ""}
            onChange={(e) => update("notes", e.target.value)}
            rows={4}
            placeholder="Notas sobre o contato..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition-colors focus:border-[#FA6801] focus:ring-2 focus:ring-[#FA6801]/20 resize-none"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-600">Evento</label>
            {form.event_tag && (
              <button
                type="button"
                onClick={() => {
                  update("event_tag", "");
                  setTimeout(() => document.getElementById("event-tag-input")?.focus(), 0);
                }}
                className="text-xs text-[#FA6801] underline-offset-2 hover:underline"
              >
                Trocar evento
              </button>
            )}
          </div>
          <input
            id="event-tag-input"
            type="text"
            value={form.event_tag || ""}
            placeholder="Ex: Web Summit 2026"
            onChange={(e) => update("event_tag", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition-colors focus:border-[#FA6801] focus:ring-2 focus:ring-[#FA6801]/20"
          />
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <button
          onClick={handleSave}
          disabled={!form.name?.trim() || saving}
          className="w-full rounded-xl bg-[#FA6801] py-[14px] text-lg font-semibold text-white disabled:opacity-40 active:bg-[#E55D00] transition-colors"
          style={{ minHeight: 52 }}
        >
          {saving ? "Salvando..." : saveLabel}
        </button>
        <button
          onClick={onReset}
          disabled={saving}
          className="w-full rounded-xl border border-[#FA6801]/30 bg-white py-[14px] text-lg font-semibold text-[#FA6801] active:bg-[#FFF3EB] transition-colors disabled:opacity-40"
          style={{ minHeight: 52 }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
