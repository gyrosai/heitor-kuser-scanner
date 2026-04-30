"use client";

import { ContactData, ContactRecord, Importance } from "@/lib/types";
import CardImagePreview from "./CardImagePreview";
import StarRating from "./StarRating";
import TagChips from "./TagChips";

interface DuplicateModalProps {
  existing: ContactRecord;
  newContact: ContactData;
  onMerge: () => void;
  onForceCreate: () => void;
  onCancel: () => void;
  busy?: boolean;
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function ContactCard({
  title,
  subtitle,
  contact,
  contactId,
  hasImage,
  showImage,
  badgeColor,
}: {
  title: string;
  subtitle?: string;
  contact: ContactData;
  contactId?: number;
  hasImage?: boolean;
  showImage: boolean;
  badgeColor: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-2 w-2 rounded-full ${badgeColor}`}
          aria-hidden
        />
        <p className="text-sm font-semibold text-slate-700">{title}</p>
      </div>
      {subtitle && <p className="text-xs text-slate-400 -mt-2">{subtitle}</p>}

      {showImage && contactId != null && hasImage && (
        <CardImagePreview contactId={contactId} className="max-h-40" />
      )}

      <div className="space-y-1 text-sm text-slate-700">
        <p className="font-semibold text-base text-slate-800">
          {contact.name || "—"}
        </p>
        {contact.company && <p className="text-slate-600">{contact.company}</p>}
        {contact.role && <p className="text-slate-500">{contact.role}</p>}
        {contact.email && <p className="text-slate-500">{contact.email}</p>}
        {contact.phone && <p className="text-slate-500">{contact.phone}</p>}
        {contact.event_tag && (
          <p className="text-xs text-slate-400 mt-2">
            Evento: {contact.event_tag}
          </p>
        )}
      </div>

      {contact.importance != null && (
        <StarRating
          value={contact.importance as Importance}
          readonly
          size="sm"
        />
      )}
      {contact.tags && contact.tags.length > 0 && (
        <TagChips value={contact.tags} readonly size="sm" />
      )}
    </div>
  );
}

export default function DuplicateModal({
  existing,
  newContact,
  onMerge,
  onForceCreate,
  onCancel,
  busy = false,
}: DuplicateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC] overflow-y-auto">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-4">
        <h2 className="text-lg font-semibold text-slate-800">
          Contato parecido encontrado
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Já existe um contato com este email/telefone neste evento. O que você
          quer fazer?
        </p>
      </header>

      <div className="flex-1 px-4 py-6 space-y-4">
        <ContactCard
          title="Contato existente"
          subtitle={`Escaneado em ${formatDate(existing.scanned_at)}`}
          contact={existing}
          contactId={existing.id}
          hasImage={existing.has_image}
          showImage
          badgeColor="bg-emerald-500"
        />

        <ContactCard
          title="Novo escaneado"
          contact={newContact}
          showImage={false}
          badgeColor="bg-[#FA6801]"
        />
      </div>

      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-4 space-y-3">
        <button
          onClick={onMerge}
          disabled={busy}
          className="w-full rounded-xl bg-[#FA6801] py-[14px] text-base font-semibold text-white disabled:opacity-40 active:bg-[#E55D00] transition-colors"
          style={{ minHeight: 52 }}
        >
          {busy ? "Atualizando..." : "Atualizar existente"}
        </button>
        <button
          onClick={onForceCreate}
          disabled={busy}
          className="w-full rounded-xl border border-slate-300 bg-white py-[14px] text-base font-semibold text-slate-700 disabled:opacity-40 active:bg-slate-50 transition-colors"
          style={{ minHeight: 52 }}
        >
          Criar duplicado mesmo assim
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="w-full py-3 text-sm font-medium text-slate-500 disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
