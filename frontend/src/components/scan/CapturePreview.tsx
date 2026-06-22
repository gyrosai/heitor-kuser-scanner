"use client";

import { QrCode } from "lucide-react";

interface CapturePreviewProps {
  cardImageDataUrl?: string;
  capturedAt: Date;
  source: "card_photo" | "qrcode" | "manual";
  extractedFields?: number;
}

function humanizeCapturedAt(date: Date): string {
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin <= 0) return "Agora mesmo";
  if (diffMin < 60) return `Há ${diffMin} min`;
  return `Hoje, ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function CapturePreview({
  cardImageDataUrl,
  capturedAt,
  source,
  extractedFields,
}: CapturePreviewProps) {
  if (source === "manual") return null;

  return (
    <div className="border border-border-default rounded-2xl p-3 flex gap-3">
      <div className="w-[120px] h-[75px] rounded-xl overflow-hidden shrink-0">
        {cardImageDataUrl ? (
          <img
            src={cardImageDataUrl}
            alt="Cartão capturado"
            className="w-full h-full object-cover"
          />
        ) : source === "qrcode" ? (
          <div className="w-full h-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
            <QrCode size={32} className="text-white" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-purple-600" />
        )}
      </div>

      <div className="flex flex-col justify-center min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[1.2px] text-laranja-360 mb-1">
          CARTÃO CAPTURADO.
        </p>
        {extractedFields != null && (
          <p className="text-xs text-text-muted">{extractedFields} campos extraídos</p>
        )}
        <p className="text-xs text-text-muted">{humanizeCapturedAt(capturedAt)}</p>
      </div>
    </div>
  );
}
