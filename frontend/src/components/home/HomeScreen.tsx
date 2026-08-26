"use client";

import { useCallback, useEffect, useState } from 'react';
import { Camera, QrCode, Layers, Filter, Download } from 'lucide-react';
import { ALLOWED_TAGS, ContactRecord, EventInfo, Importance } from '@/lib/types';
import { exportCSV, listContacts, listEvents } from '@/lib/api';
import type { EmailQuota } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Section } from '@/components/ui/Section';
import { UserBar } from './UserBar';
import { CimiLeadsWordmark } from './CimiLeadsWordmark';
import { CaptureCard } from './CaptureCard';
import { Footer } from './Footer';
import { PendingSavesBanner } from './PendingSavesBanner';
import { SearchInput } from './SearchInput';
import { ContactListCard } from '@/components/contact/ContactListCard';

interface Filters {
  event_tag: string;
  min_importance: number | null;
  tags: string[];
  include_imported: boolean;
}

const EMPTY_FILTERS: Filters = {
  event_tag: '',
  min_importance: null,
  tags: [],
  include_imported: false,
};

interface HomeScreenProps {
  userName?: string;
  quota: EmailQuota | null;
  pendingCount: number;
  refreshKey: number;
  onSavesFlushed?: () => void;
  onScanCartao: () => void;
  onScanQR: () => void;
  onScanSequence: () => void;
  onSelectContact: (id: number) => void;
  onLogout: () => void;
  onAbout: () => void;
}

export function HomeScreen({
  userName,
  quota,
  pendingCount,
  refreshKey,
  onSavesFlushed,
  onScanCartao,
  onScanQR,
  onScanSequence,
  onSelectContact,
  onLogout,
  onAbout,
}: HomeScreenProps) {
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [importedTotal, setImportedTotal] = useState<number | null>(null);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      if (filters.include_imported) {
        const page = await listContacts({
          event_tag: filters.event_tag || undefined,
          min_importance: filters.min_importance ?? undefined,
          tags: filters.tags.length ? filters.tags : undefined,
          include_imported: true,
        });
        setContacts(Array.isArray(page?.contacts) ? page.contacts : []);
        setImportedTotal(typeof page?.total === 'number' ? page.total : null);
      } else {
        const data = await listContacts({
          event_tag: filters.event_tag || undefined,
          min_importance: filters.min_importance ?? undefined,
          tags: filters.tags.length ? filters.tags : undefined,
        });
        setContacts(Array.isArray(data) ? data : []);
        setImportedTotal(null);
      }
      setLoadError(false);
    } catch {
      // NÃO zera a lista: "0 contatos" seria mentira. Preserva o que já
      // carregou e sinaliza o erro; o estado vazio+erro vira card de retry.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts, refreshKey]);

  useEffect(() => {
    listEvents()
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [refreshKey]);

  const filteredContacts = searchQuery.trim()
    ? contacts.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          c.name?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q)
        );
      })
    : contacts;

  const hasActiveFilters =
    filters.event_tag !== '' ||
    filters.min_importance !== null ||
    filters.tags.length > 0 ||
    filters.include_imported;

  const toggleTag = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const handleExport = () => {
    if (contacts.length === 0) {
      showToast('Nenhum contato para exportar', 'info');
      return;
    }
    exportCSV({
      event_tag: filters.event_tag || undefined,
      min_importance: filters.min_importance ?? undefined,
      tags: filters.tags.length ? filters.tags : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      {/* Header: UserBar + Wordmark */}
      <header className="bg-white border-b border-border-default shrink-0">
        <UserBar userName={userName ?? ''} quota={quota} onLogout={onLogout} onAbout={onAbout} />
        <CimiLeadsWordmark />
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Saves que falharam por rede (ou precisam de revisão por 422) */}
        <PendingSavesBanner onFlushed={onSavesFlushed} onOpenContact={onSelectContact} />

        {/* Capture modes */}
        <Section title="Escaneie um contato">
          <div className="flex flex-col gap-[10px]">
            <CaptureCard
              variant="primary"
              icon={Camera}
              title="Cartão de Visita"
              subtitle="Tire uma foto e extraia os dados"
              onClick={onScanCartao}
            />
            <CaptureCard
              variant="secondary"
              icon={QrCode}
              title="QR Code"
              subtitle="Aponte para um código QR"
              onClick={onScanQR}
            />
            <CaptureCard
              variant="tertiary"
              icon={Layers}
              title="Em sequência"
              subtitle={
                pendingCount > 0
                  ? `${pendingCount} foto${pendingCount === 1 ? '' : 's'} na fila`
                  : 'Várias fotos, processadas depois'
              }
              badge={pendingCount > 0 ? pendingCount : undefined}
              onClick={onScanSequence}
            />
          </div>
        </Section>

        {/* Contact list */}
        <div className="px-5 pt-[18px] pb-2">
          {/* List header */}
          <div className="flex items-center justify-between mb-[14px]">
            <p className="text-[10px] font-bold uppercase tracking-[1.4px] text-azul-noturno">
              Contatos
              <span className="text-text-subtle font-semibold ml-1.5">
                {importedTotal != null ? importedTotal : contacts.length}
              </span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                aria-label="Filtros"
                className={`w-[34px] h-[34px] rounded-md border flex items-center justify-center cursor-pointer transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-laranja-360 border-laranja-360 text-white'
                    : 'bg-white border-border-default text-azul-noturno'
                }`}
              >
                <Filter size={15} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={handleExport}
                aria-label="Exportar CSV"
                className="w-[34px] h-[34px] rounded-md border border-border-default bg-white flex items-center justify-center cursor-pointer text-azul-noturno"
              >
                <Download size={15} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Search input */}
          <div className="mb-[14px]">
            <SearchInput value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mb-4 rounded-2xl bg-white border border-border-default p-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-text-subtle mb-1">Evento</label>
                <select
                  value={filters.event_tag}
                  onChange={(e) => setFilters((p) => ({ ...p, event_tag: e.target.value }))}
                  className="w-full rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-default"
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
                <label className="block text-xs font-medium text-text-subtle mb-1">
                  Importância mínima
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() =>
                        setFilters((p) => ({
                          ...p,
                          min_importance: p.min_importance === n ? null : n,
                        }))
                      }
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        filters.min_importance === n
                          ? 'bg-laranja-360 text-white'
                          : 'bg-app-bg text-text-muted'
                      }`}
                    >
                      {'★'.repeat(n)}+
                    </button>
                  ))}
                  {filters.min_importance !== null && (
                    <button
                      type="button"
                      onClick={() => setFilters((p) => ({ ...p, min_importance: null }))}
                      className="text-xs text-text-subtle underline"
                    >
                      limpar
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-subtle mb-1">
                  Tags (qualquer)
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALLOWED_TAGS.map((tag) => {
                    const active = filters.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          active ? 'bg-laranja-360 text-white' : 'bg-app-bg text-text-muted'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-text-default cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.include_imported}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, include_imported: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border-default accent-laranja-360"
                />
                Incluir Base Heitor (contatos importados)
              </label>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="text-xs text-text-subtle underline self-start"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          )}

          {/* Aviso discreto quando o refresh falhou mas há lista anterior */}
          {loadError && !loading && contacts.length > 0 && (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-warning-border bg-warning-bg px-3 py-2">
              <p className="text-[11px] text-warning-fg">
                Não foi possível atualizar a lista.
              </p>
              <button
                type="button"
                onClick={() => void loadContacts()}
                className="text-[11px] font-bold text-warning-fg underline shrink-0"
              >
                Tentar de novo
              </button>
            </div>
          )}

          {/* Contact list */}
          {loading ? (
            <div className="rounded-2xl bg-white border border-border-default p-6 text-center text-text-subtle text-sm">
              Carregando...
            </div>
          ) : loadError && contacts.length === 0 ? (
            <div className="rounded-2xl bg-white border border-border-default p-6 text-center">
              <p className="text-sm text-text-muted">
                Não foi possível carregar os contatos. Verifique sua conexão.
              </p>
              <button
                type="button"
                onClick={() => void loadContacts()}
                className="mt-3 text-sm font-bold text-laranja-360 underline"
              >
                Tentar de novo
              </button>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="rounded-2xl bg-white border border-border-default p-6 text-center text-sm text-text-muted">
              {searchQuery
                ? 'Nenhum contato encontrado para essa busca'
                : hasActiveFilters
                ? 'Nenhum contato com esses filtros'
                : 'Nenhum contato escaneado ainda'}
            </div>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {filteredContacts.map((c) => (
                <ContactListCard
                  key={c.id}
                  contact={c}
                  onClick={() => onSelectContact(c.id)}
                  // Reenviar abre o mesmo editor (mesmo seletor de produto/idioma/materiais
                  // do EmailKitSection) — não há UI separada duplicando essa configuração.
                  onResend={() => onSelectContact(c.id)}
                />
              ))}
            </div>
          )}
        </div>

        <Footer onAbout={onAbout} />
      </div>
    </div>
  );
}
