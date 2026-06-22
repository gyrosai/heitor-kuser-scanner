import { QrCode, Cloud, CloudOff, Mail, MailCheck, AlertCircle, Star } from 'lucide-react';
import { ContactRecord, tagsToClassificacoes } from '@/lib/types';
import { getContactImageUrl } from '@/lib/api';
import { ClassificationChip, ClassificationChipData } from './ClassificationChip';
import { useState } from 'react';

interface ContactListCardProps {
  contact: ContactRecord;
  onClick: () => void;
}

function initials(name: string): string {
  const parts = name.split(' ').filter((p) => p.length > 1);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function getChips(tags: string[]): ClassificationChipData[] {
  const cls = tagsToClassificacoes(tags);
  const chips: ClassificationChipData[] = [];
  if (cls.cimi_invest) chips.push({ type: 'invest', sub: capitalize(cls.cimi_invest) });
  if (cls.cimi_360) chips.push({ type: 'cimi360', sub: capitalize(cls.cimi_360) });
  return chips;
}

function Thumb({ contact }: { contact: ContactRecord }) {
  const [imgError, setImgError] = useState(false);

  if (contact.has_image && !imgError) {
    return (
      <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden">
        <img
          src={getContactImageUrl(contact.id)}
          alt="Foto do cartão"
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (contact.source === 'qrcode') {
    return (
      <div className="w-14 h-14 shrink-0 rounded-lg bg-surface-muted border border-border-default flex items-center justify-center">
        <QrCode size={28} strokeWidth={1.4} className="text-text-subtle" />
      </div>
    );
  }

  return (
    <div className="w-14 h-14 shrink-0 rounded-lg bg-azul-noturno flex items-center justify-center text-white text-lg font-bold">
      {initials(contact.name || '?')}
    </div>
  );
}

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-[1px] shrink-0">
      {[0, 1, 2].map((i) =>
        i < count ? (
          <Star key={i} size={12} strokeWidth={1.6} className="text-laranja-360 fill-laranja-360" />
        ) : (
          <Star key={i} size={12} strokeWidth={1.6} className="text-border-strong" />
        ),
      )}
    </div>
  );
}

function SyncBadge({ synced }: { synced: boolean }) {
  if (synced) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-fg">
        <Cloud size={12} strokeWidth={2.2} />
        Sincronizado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning-fg">
      <CloudOff size={12} strokeWidth={2.2} />
      Sync pendente
    </span>
  );
}

function EmailBadge({ status }: { status: ContactRecord['email_status'] }) {
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-fg">
        <MailCheck size={12} strokeWidth={2.2} />
        Mídia kit enviado
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger-fg">
        <AlertCircle size={12} strokeWidth={2.2} />
        Falha no envio
      </span>
    );
  }
  if (status === 'skipped') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-subtle">
        <Mail size={12} strokeWidth={2.2} />
        Não enviado
      </span>
    );
  }
  return null;
}

export function ContactListCard({ contact, onClick }: ContactListCardProps) {
  const chips = getChips(contact.tags ?? []);
  const importance = contact.importance ?? 0;
  const synced = !!contact.google_contact_id;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex gap-3 bg-white border border-border-default rounded-2xl p-3 text-left active:bg-app-bg transition-colors"
    >
      <Thumb contact={contact} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] font-bold text-azul-noturno leading-[1.25] tracking-[-0.1px] truncate">
            {contact.name || 'Sem nome'}
          </p>
          {importance > 0 && <StarRow count={importance} />}
        </div>

        {(contact.company || contact.role) && (
          <p className="mt-0.5 text-[12px] leading-[1.3] truncate">
            {contact.company && (
              <span className="font-semibold text-text-default">{contact.company}</span>
            )}
            {contact.company && contact.role && (
              <span className="text-text-subtle"> · {contact.role}</span>
            )}
            {!contact.company && contact.role && (
              <span className="text-text-muted">{contact.role}</span>
            )}
          </p>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-[5px] mt-2">
            {chips.map((cls, i) => (
              <ClassificationChip key={i} cls={cls} />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-[10px] mt-2">
          <SyncBadge synced={synced} />
          <EmailBadge status={contact.email_status ?? null} />
        </div>
      </div>
    </button>
  );
}
