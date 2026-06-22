"use client";

import { useRef, useState, useEffect, useCallback } from "react";

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
    // First attempt: force rear camera (fails if not available)
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  } catch {
    // Fallback: prefer rear but accept any
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
  }
}

export default function CardCapture({ onCapture, onClose }: CardCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorType, setErrorType] = useState<"permission" | "unavailable" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [rearDevices, setRearDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIdx, setCurrentDeviceIdx] = useState(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      setPhase("loading");
      setErrorType(null);
      stopStream();

      try {
        const stream = await openRearCamera(deviceId);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Enumerate after permission grant so labels are visible
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          // Heuristic: prefer devices with "back/rear/environment" in label
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

  // Start camera on mount; stop on unmount
  useEffect(() => {
    startCamera();
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || phase !== "live") return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const previewUrl = URL.createObjectURL(blob);
        setPreview(previewUrl);
        const base64 = await compressBlob(blob);
        setBase64Data(base64);
        stopStream();
        setPhase("preview");
      } catch (err) {
        console.error("Capture error:", err);
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC]">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold text-slate-800">Fotografar Cartão</h2>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xl"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">

        {/* ── Sending ── */}
        {phase === "sending" && (
          <>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#FA6801] border-t-transparent" />
            <p className="text-lg text-slate-500">Analisando cartão...</p>
          </>
        )}

        {/* ── Preview after capture ── */}
        {phase === "preview" && preview && (
          <>
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview do cartão" className="w-full object-contain" />
            </div>
            <div className="flex w-full max-w-sm gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 rounded-xl border border-[#FA6801]/30 bg-white py-4 text-lg font-semibold text-[#FA6801] active:bg-[#FFF3EB] transition-colors"
              >
                Tirar Outra
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-xl bg-[#FA6801] py-4 text-lg font-semibold text-white active:bg-[#E55D00] transition-colors"
              >
                Enviar
              </button>
            </div>
          </>
        )}

        {/* ── Live viewfinder (+ loading overlay while stream initialises) ── */}
        {(phase === "loading" || phase === "live") && (
          <div className="flex w-full flex-col items-center gap-4">
            <div
              className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-black shadow-sm"
              style={{ aspectRatio: "4/3" }}
            >
              {/* Video is always rendered so the ref attaches; hidden while loading */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="h-full w-full object-cover"
                style={{ opacity: phase === "live" ? 1 : 0 }}
              />
              {phase === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
                </div>
              )}
            </div>

            {phase === "live" && (
              <>
                <div className="flex w-full max-w-sm items-center gap-3">
                  {rearDevices.length > 1 && (
                    <button
                      onClick={handleSwitchCamera}
                      title="Trocar câmera"
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={handleCapture}
                    className="flex-1 rounded-xl bg-[#FA6801] py-5 text-lg font-semibold text-white active:bg-[#E55D00] transition-colors"
                  >
                    Capturar
                  </button>
                </div>
                <p className="text-center text-sm text-slate-400">
                  Posicione o cartão sobre uma superfície plana e com boa iluminação
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Error + gallery fallback ── */}
        {phase === "error" && (
          <>
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-red-200 bg-red-50">
              <svg className="h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="mb-1 text-lg font-semibold text-slate-700">
                {errorType === "permission" ? "Permissão negada" : "Câmera indisponível"}
              </p>
              <p className="text-sm text-slate-500">
                {errorType === "permission"
                  ? "Permita o acesso à câmera nas configurações do navegador."
                  : "Não foi possível acessar a câmera traseira."}
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFallbackFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-xs rounded-xl border border-[#FA6801]/30 bg-white py-5 text-lg font-semibold text-[#FA6801] active:bg-[#FFF3EB] transition-colors"
            >
              Selecionar da galeria
            </button>
          </>
        )}
      </div>
    </div>
  );
}
