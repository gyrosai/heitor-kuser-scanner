"use client";

import { useRef, useState } from "react";

interface CardCaptureProps {
  onCapture: (imageBase64: string) => void;
  onClose: () => void;
}

function compressImage(file: File, maxWidth = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
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
        if (!ctx) {
          reject(new Error("Canvas context failed"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        const base64 = dataUrl.split(",")[1];
        resolve(base64);
      };
      img.onerror = () => reject(new Error("Erro ao carregar imagem"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export default function CardCapture({ onCapture, onClose }: CardCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      const base64 = await compressImage(file);
      setBase64Data(base64);
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
    }
  };

  const handleConfirm = () => {
    if (!base64Data) return;
    setSending(true);
    onCapture(base64Data);
  };

  const handleRetake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setBase64Data(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC]">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold text-slate-800">
          Fotografar Cartão
        </h2>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xl"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        {sending ? (
          <>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="text-lg text-slate-500">Analisando cartão...</p>
          </>
        ) : preview ? (
          <>
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview do cartão"
                className="w-full object-contain"
              />
            </div>

            <div className="flex w-full max-w-sm gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 rounded-xl border border-indigo-200 bg-white py-4 text-lg font-semibold text-indigo-600 active:bg-indigo-50 transition-colors"
              >
                Tirar Outra
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-xl bg-indigo-600 py-4 text-lg font-semibold text-white active:bg-indigo-700 transition-colors"
              >
                Enviar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100">
              <svg
                className="h-16 w-16 text-indigo-600"
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

            <p className="text-center text-slate-500 text-lg">
              Tire uma foto do cartão de visita
            </p>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={() => inputRef.current?.click()}
              className="w-full max-w-xs rounded-xl bg-indigo-600 py-5 text-lg font-semibold text-white active:bg-indigo-700 transition-colors"
              style={{ minHeight: 52 }}
            >
              Abrir Camera
            </button>

            <p className="text-center text-sm text-slate-400">
              Posicione o cartão sobre uma superficie plana e com boa iluminacao
            </p>
          </>
        )}
      </div>
    </div>
  );
}
