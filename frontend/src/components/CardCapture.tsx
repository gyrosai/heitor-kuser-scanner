"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import CameraView from "./scan/CameraView";
import ShutterButton from "./scan/ShutterButton";
import CaptureHeader from "./scan/CaptureHeader";

interface CardCaptureProps {
  onCapture: (imageBase64: string) => void;
  onClose: () => void;
}

type Phase = "loading" | "live" | "preview" | "error" | "sending";

function compressBlob(blob: Blob, maxWidth = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = document.createElement("img");
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context failed")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Erro ao carregar imagem")); };
    img.src = url;
  });
}

async function openRearCamera(deviceId?: string): Promise<MediaStream> {
  if (deviceId) {
    return navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
  }
}

export default function CardCapture({ onCapture, onClose }: CardCaptureProps) {
  const streamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorType, setErrorType] = useState<"permission" | "unavailable" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [rearDevices, setRearDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIdx, setCurrentDeviceIdx] = useState(0);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActiveStream(null);
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      setPhase("loading");
      setErrorType(null);
      stopStream();

      try {
        const stream = await openRearCamera(deviceId);
        streamRef.current = stream;
        setActiveStream(stream);

        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          const rear = videoInputs.filter((d) =>
            /back|rear|environment|traseira/i.test(d.label)
          );
          const list = rear.length > 1 ? rear : rear.length === 1 ? rear : videoInputs;
          setRearDevices(list);
        } catch {
          // Non-critical — enumeration may fail without affecting capture
        }

        setPhase("live");
      } catch (err) {
        const name = (err as DOMException).name ?? "";
        const isPermission =
          name === "NotAllowedError" ||
          name === "PermissionDeniedError" ||
          (err as Error).message?.toLowerCase().includes("permission");
        setErrorType(isPermission ? "permission" : "unavailable");
        setPhase("error");
      }
    },
    [stopStream]
  );

  useEffect(() => {
    startCamera();
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    const video = videoElementRef.current;
    if (!video || phase !== "live" || capturing) return;
    setCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setCapturing(false); return; }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) { setCapturing(false); return; }
      try {
        const previewUrl = URL.createObjectURL(blob);
        setPreview(previewUrl);
        const base64 = await compressBlob(blob);
        setBase64Data(base64);
        stopStream();
        setPhase("preview");
      } catch (err) {
        console.error("Capture error:", err);
      } finally {
        setCapturing(false);
      }
    }, "image/jpeg", 0.92);
  };

  const handleRetake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setBase64Data(null);
    startCamera(rearDevices[currentDeviceIdx]?.deviceId);
  };

  const handleConfirm = () => {
    if (!base64Data) return;
    setPhase("sending");
    onCapture(base64Data);
  };

  const handleSwitchCamera = () => {
    const nextIdx = (currentDeviceIdx + 1) % rearDevices.length;
    setCurrentDeviceIdx(nextIdx);
    startCamera(rearDevices[nextIdx]?.deviceId);
  };

  const handleFallbackFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      const base64 = await compressBlob(file);
      setBase64Data(base64);
      setPhase("preview");
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
    }
  };

  const switchButton = rearDevices.length > 1 ? (
    <button
      onClick={handleSwitchCamera}
      aria-label="Trocar câmera"
      className="flex h-11 w-11 items-center justify-center rounded-full text-white active:opacity-70 transition-opacity"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  ) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <CaptureHeader
        title="Cartão de Visita"
        onClose={onClose}
        rightAction={switchButton}
      />

      <div className="relative flex-1 overflow-hidden">
        {/* Camera feed — always mounted during loading/live so ref attaches */}
        {(phase === "loading" || phase === "live") && (
          <CameraView
            stream={activeStream}
            onVideoReady={(v) => { videoElementRef.current = v; }}
          />
        )}

        {/* Loading spinner overlay */}
        {phase === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          </div>
        )}

        {/* Preview after capture */}
        {phase === "preview" && preview && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={preview} alt="Preview do cartão" className="absolute inset-0 h-full w-full object-cover" />
        )}

        {/* Sending */}
        {phase === "sending" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-laranja-360 border-t-transparent" />
            <p className="text-lg text-white/70">Analisando cartão...</p>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-danger-border bg-danger-bg">
              <svg className="h-12 w-12 text-danger-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="mb-1 text-lg font-semibold text-white">
                {errorType === "permission" ? "Permissão negada" : "Câmera indisponível"}
              </p>
              <p className="text-sm text-white/60">
                {errorType === "permission"
                  ? "Permita o acesso à câmera nas configurações do navegador."
                  : "Não foi possível acessar a câmera traseira."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {(phase === "live" || phase === "loading") && (
        <div className="flex flex-col items-center gap-3 bg-black pb-10 pt-5">
          <ShutterButton
            onClick={handleCapture}
            loading={capturing}
            disabled={phase === "loading"}
          />
          {phase === "live" && (
            <p className="text-center text-xs text-white/50">
              Posicione o cartão sobre uma superfície plana e com boa iluminação
            </p>
          )}
        </div>
      )}

      {phase === "preview" && (
        <div className="flex gap-3 bg-black px-6 pb-10 pt-4">
          <button
            onClick={handleRetake}
            className="flex-1 rounded-xl border border-laranja-360/30 bg-white/10 py-4 text-lg font-semibold text-white active:opacity-80 transition-opacity"
          >
            Tirar Outra
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-xl bg-laranja-360 py-4 text-lg font-semibold text-white active:opacity-80 transition-opacity"
          >
            Enviar
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className="bg-black px-6 pb-10 pt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFallbackFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border border-laranja-360/30 bg-white/10 py-5 text-lg font-semibold text-white active:opacity-80 transition-opacity"
          >
            Selecionar da galeria
          </button>
        </div>
      )}
    </div>
  );
}
