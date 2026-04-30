"use client";

import { useState } from "react";
import { getContactImageUrl } from "@/lib/api";

interface CardImagePreviewProps {
  contactId: number;
  alt?: string;
  className?: string;
}

export default function CardImagePreview({
  contactId,
  alt = "Foto do cartão",
  className = "",
}: CardImagePreviewProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 ${className}`}
        style={{ aspectRatio: "16 / 10" }}
        aria-label="Sem foto"
      >
        <svg
          className="h-10 w-10"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      </div>
    );
  }

  // TODO (PR3): se card_image puder ser sobrescrito após o primeiro scan,
  // adicionar cache-buster `?v=${updated_at}` para evitar imagem stale.
  return (
    <img
      src={getContactImageUrl(contactId)}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className={`w-full rounded-xl object-cover bg-slate-100 ${className}`}
      style={{ aspectRatio: "16 / 10" }}
    />
  );
}
