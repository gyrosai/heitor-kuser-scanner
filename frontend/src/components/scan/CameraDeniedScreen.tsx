"use client";

import { X, Camera, RefreshCw, Images } from "lucide-react";

interface CameraDeniedScreenProps {
  onClose: () => void;
  onPickFromGallery?: () => void;
  mode: "card" | "qr";
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-laranja-360/18 border border-laranja-360/40 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[11px] font-bold text-laranja-360">{n}</span>
      </div>
      <p className="text-[13px] text-white/75 leading-snug">{text}</p>
    </div>
  );
}

export function CameraDeniedScreen({
  onClose,
  onPickFromGallery,
  mode,
}: CameraDeniedScreenProps) {
  const contextText =
    mode === "card"
      ? "O CIMI Leads precisa da câmera para capturar cartões. A permissão foi negada antes — siga os passos:"
      : "O CIMI Leads precisa da câmera para ler códigos QR. A permissão foi negada antes — siga os passos:";

  return (
    <div className="fixed inset-0 bg-azul-noturno overflow-y-auto">
      <div className="relative min-h-full pt-6 px-7 pb-8 flex flex-col gap-6">

        {/* Close button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-[38px] h-[38px] rounded-full bg-white/10 border border-white/15 flex items-center justify-center active:opacity-70 transition-opacity"
          >
            <X size={16} strokeWidth={2.2} className="text-white" />
          </button>
        </div>

        {/* Camera icon with X badge */}
        <div className="relative w-14 h-14">
          <div className="w-14 h-14 rounded-2xl bg-white/8 border border-white/15 flex items-center justify-center">
            <Camera size={26} strokeWidth={1.8} className="text-white/60" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-danger-bg border-2 border-azul-noturno flex items-center justify-center">
            <X size={10} strokeWidth={3} className="text-danger-fg" />
          </div>
        </div>

        {/* Copy */}
        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-laranja-360">
            ACESSO À CÂMERA BLOQUEADO.
          </div>
          <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-tight">
            Ative a câmera no navegador
          </h1>
          <p className="text-[13px] text-white/65 leading-relaxed">
            {contextText}
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-4">
          <Step n={1} text="Toque no cadeado ao lado da URL no topo do navegador" />
          <Step n={2} text="Vá em Permissões e ative Câmera" />
          <Step n={3} text="Recarregue o app" />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 rounded-xl min-h-[52px] px-4 font-bold text-[15px] bg-laranja-360 text-white active:opacity-80 transition-opacity"
          >
            <RefreshCw size={16} strokeWidth={2.2} />
            Recarregar app
          </button>

          {mode === "card" && onPickFromGallery && (
            <button
              onClick={onPickFromGallery}
              className="w-full flex items-center justify-center gap-2 rounded-xl min-h-[52px] px-4 font-bold text-[15px] bg-white/10 border border-white/15 text-white active:opacity-80 transition-opacity"
            >
              <Images size={16} strokeWidth={2} />
              Selecionar da galeria
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
