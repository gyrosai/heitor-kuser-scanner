"use client";

import { useRef } from "react";

interface CardCaptureProps {
  onCapture: (imageBase64: string) => void;
  onClose: () => void;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context failed"));
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL("image/jpeg", 0.8);
        resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CardCapture({ onCapture, onClose }: CardCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImage(file);
      onCapture(base64);
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0f1a]">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold text-white">Fotografar Cartao</h2>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white text-xl"
        >
          X
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#1a1a2e] border border-[#2a2a3e]">
          <svg
            className="h-16 w-16 text-indigo-500"
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

        <p className="text-center text-slate-400 text-lg">
          Tire uma foto do cartao de visita
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => inputRef.current?.click()}
          className="w-full max-w-xs rounded-2xl bg-indigo-500 py-5 text-lg font-semibold text-white active:bg-indigo-600 transition-colors"
        >
          Abrir Camera
        </button>

        <p className="text-center text-sm text-slate-500">
          Posicione o cartao sobre uma superficie plana e com boa iluminacao
        </p>
      </div>
    </div>
  );
}
