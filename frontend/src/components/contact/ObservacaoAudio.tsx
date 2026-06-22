"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { apiBaseUrl } from "@/lib/api";

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

interface ObservacaoAudioProps {
  onTranscribed: (notes: string) => void;
}

export default function ObservacaoAudio({ onTranscribed }: ObservacaoAudioProps) {
  const [audio, setAudio] = useState<AudioState>({ status: "idle" });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startedAt = audio.status === "recording" ? audio.startedAt : 0;
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
          const res = await fetch(`${apiBaseUrl()}/api/transcribe`, {
            method: "POST",
            body: fd,
          });
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
    <div className="flex items-center gap-3 min-h-[44px]">
      {audio.status === "idle" && (
        <Button variant="secondary" size="sm" onClick={start}>
          🎤 Gravar áudio
        </Button>
      )}

      {audio.status === "recording" && (
        <>
          <span className="flex items-center gap-1.5 text-danger-fg font-semibold text-sm">
            <span className="w-2 h-2 rounded-full bg-danger-fg animate-pulse" />
            Gravando {fmtTime(elapsed)}
          </span>
          <Button variant="secondary" size="sm" onClick={stop}>
            ⏹ Parar
          </Button>
        </>
      )}

      {audio.status === "processing" && (
        <p className="text-sm text-text-muted py-2">Transcrevendo...</p>
      )}

      {audio.status === "done" && (
        <>
          <span className="text-sm text-success-fg font-semibold">
            ✓ Transcrição aplicada
          </span>
          <Button variant="secondary" size="sm" onClick={reset}>
            🎤 Regravar
          </Button>
        </>
      )}

      {audio.status === "error" && (
        <>
          <span className="text-sm text-danger-fg">{audio.message}</span>
          <Button variant="secondary" size="sm" onClick={reset}>
            Tentar novamente
          </Button>
        </>
      )}
    </div>
  );
}
