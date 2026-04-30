"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ALLOWED_TAGS,
  ContactRecord,
  EventInfo,
  Importance,
} from "@/lib/types";
import { exportCSV, listContacts, listEvents } from "@/lib/api";
import { useToast } from "./Toast";
import CardImagePreview from "./CardImagePreview";
import StarRating from "./StarRating";

interface ContactHistoryProps {
  onOpenContact: (id: number) => void;
  refreshKey?: number;
}

interface Filters {
  event_tag: string;
  min_importance: number | null;
  tags: string[];
}

const EMPTY_FILTERS: Filters = {
  event_tag: "",
  min_importance: null,
  tags: [],
};

export default function ContactHistory({
  onOpenContact,
  refreshKey = 0,
}: ContactHistoryProps) {
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listContacts({
        event_tag: filters.event_tag || undefined,
        min_importance: filters.min_importance ?? undefined,
        tags: filters.tags.length ? filters.tags : undefined,
      });
      setContacts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erro ao listar contatos:", e);
      showToast("Erro ao carregar histórico de contatos", "error");
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts, refreshKey]);

  useEffect(() => {
    listEvents()
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [refreshKey]);

  const hasActiveFilters =
    filters.event_tag !== "" ||
    filters.min_importance !== null ||
    filters.tags.length > 0;

  const toggleTag = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleExport = () => {
    if (contacts.length === 0) {
      showToast("Nenhum contato para exportar", "info");
      return;
    }
    exportCSV({
      event_tag: filters.event_tag || undefined,
      min_importance: filters.min_importance ?? undefined,
      tags: filters.tags.length ? filters.tags : undefined,
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500">
          Contatos {hasActiveFilters && "(filtrado)"}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-[#FA6801] text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Filtros{" "}
            {hasActiveFilters && (
              <span className="ml-1">
                ({(filters.event_tag ? 1 : 0) +
                  (filters.min_importance ? 1 : 0) +
                  filters.tags.length})
              </span>
            )}
          </button>
          <button
            onClick={handleExport}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            Exportar CSV
          </button>
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#FFF3EB] px-2 text-xs font-semibold text-[#FA6801]">
            {contacts.length}
          </span>
        </div>
      </div>

      {showFilters && (
        <div className="mb-4 space-y-3 rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Evento
            </label>
            <select
              value={filters.event_tag}
              onChange={(e) =>
                setFilters((p) => ({ ...p, event_tag: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos os eventos</option>
              {events.map((ev) => (
                <option key={ev.event_tag} value={ev.event_tag}>
                  {ev.event_tag} ({ev.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Importância mínima
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() =>
                    setFilters((p) => ({
                      ...p,
                      min_importance: p.min_importance === n ? null : n,
                    }))
                  }
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    filters.min_importance === n
                      ? "bg-[#FA6801] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {"★".repeat(n)}+
                </button>
              ))}
              {filters.min_importance !== null && (
                <button
                  onClick={() =>
                    setFilters((p) => ({ ...p, min_importance: null }))
                  }
                  className="text-xs text-slate-400 underline"
                >
                  limpar
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Tags (qualquer)
            </label>
            <div className="flex flex-wrap gap-2">
              {ALLOWED_TAGS.map((tag) => {
                const active = filters.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "bg-[#FA6801] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-xs text-slate-500 underline"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 text-center text-slate-400">
          Carregando...
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 text-center">
          <p className="text-slate-500">
            {hasActiveFilters
              ? "Nenhum contato com esses filtros"
              : "Nenhum contato escaneado ainda"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              onClick={() => onOpenContact(contact.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactRow({
  contact,
  onClick,
}: {
  contact: ContactRecord;
  onClick: () => void;
}) {
  const initial = contact.name?.[0]?.toUpperCase() || "?";
  return (
    <button
      onClick={onClick}
      className="flex w-full items-stretch gap-3 rounded-2xl bg-white border border-slate-200 shadow-sm p-3 text-left active:bg-slate-50 transition-colors"
    >
      <div className="shrink-0">
        {contact.has_image ? (
          <CardImagePreview
            contactId={contact.id}
            className="h-14 w-20 rounded-lg"
          />
        ) : (
          <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-[#FFF3EB] text-base font-semibold text-[#FA6801]">
            {initial}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium text-slate-800">
            {contact.name || "Sem nome"}
          </p>
          {contact.importance != null && (
            <StarRating
              value={contact.importance as Importance}
              readonly
              size="sm"
            />
          )}
        </div>
        {contact.company && (
          <p className="truncate text-sm text-slate-500">{contact.company}</p>
        )}
        {contact.tags && contact.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {contact.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
              >
                {tag}
              </span>
            ))}
            {contact.tags.length > 3 && (
              <span className="text-[10px] text-slate-400">
                +{contact.tags.length - 3}
              </span>
            )}
          </div>
        )}
        {contact.notes && (
          <p className="mt-1 truncate text-xs text-slate-400">
            {contact.notes}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2 text-[10px]">
          {contact.google_contact_id ? (
            <span className="text-emerald-600 font-medium">✓ Google</span>
          ) : (
            <span className="text-amber-600 font-medium">
              ⚠ Pendente Google
            </span>
          )}
          {contact.event_tag && (
            <span className="text-slate-400">· {contact.event_tag}</span>
          )}
        </div>
      </div>
    </button>
  );
}
