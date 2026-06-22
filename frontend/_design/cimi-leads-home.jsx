import React, { useState, useEffect } from 'react';
import {
  Camera,
  QrCode,
  Layers,
  ChevronRight,
  Mail,
  MailCheck,
  AlertCircle,
  CloudOff,
  Cloud,
  Star,
  Filter,
  Download,
  LogOut,
  Search,
} from 'lucide-react';

// =========================================
// DESIGN TOKENS — brand CIMI360
// =========================================
const COLORS = {
  laranja360: '#FA6800',
  laranjaAmbar: '#FD9E02',
  azulAtlantico: '#34A9AD',
  azulNoturno: '#002F3F',
  pageBg: '#EFEFF2',
  appBg: '#F4F4F6',
  surface: '#FFFFFF',
  surfaceMuted: '#F8F8FA',
  border: '#E5E5E8',
  borderStrong: '#C9C9D0',
  text: '#1A1A1A',
  textMuted: '#5C5C66',
  textSubtle: '#9090A0',
  success: '#1B7F47',
  successBg: '#E8F5EC',
  danger: '#B91C1C',
  dangerBg: '#FDECEC',
  warning: '#92400E',
  warningBg: '#FEF3E0',
};

const FONT_STACK = '"Montserrat", system-ui, -apple-system, sans-serif';

// =========================================
// MOCK DATA — 5 contatos cobrindo estados diversos
// =========================================
const CONTACTS = [
  {
    id: 1,
    name: 'Camila Martins',
    company: 'GYROS',
    role: 'Founder & CEO',
    importance: 2,
    classifications: [
      { type: 'invest', sub: 'Parceria' },
      { type: 'cimi360', sub: 'Stand' },
    ],
    syncStatus: 'synced',
    emailStatus: 'sent',
    cardKind: 'gyros',
    event: 'Pré-Evento Teste 2026',
  },
  {
    id: 2,
    name: 'João Pereira da Silva',
    company: 'Mendes Imóveis',
    role: 'Diretor Comercial',
    importance: 3,
    classifications: [{ type: 'cimi360', sub: 'Patrocínio' }],
    syncStatus: 'pending',
    emailStatus: 'pending',
    cardKind: 'generic-blue',
    event: 'CIMI360 2026',
  },
  {
    id: 3,
    name: 'Maria Eduarda Souza',
    company: 'Souza & Associados',
    role: 'Sócia-diretora',
    importance: 1,
    classifications: [{ type: 'invest', sub: 'Venda' }],
    syncStatus: 'synced',
    emailStatus: 'failed',
    cardKind: 'generic-green',
    event: 'CIMI360 2026',
  },
  {
    id: 4,
    name: 'Pedro Augusto Costa',
    company: 'Construtora Norte',
    role: 'CEO',
    importance: 0,
    classifications: [],
    syncStatus: 'synced',
    emailStatus: 'skipped',
    cardKind: 'qr',
    event: 'CIMI360 2026',
  },
  {
    id: 5,
    name: 'Ana Carolina Lima',
    company: 'Lima Investimentos',
    role: 'Founder',
    importance: 2,
    classifications: [
      { type: 'invest', sub: 'Parceria' },
      { type: 'cimi360', sub: 'Stand' },
    ],
    syncStatus: 'synced',
    emailStatus: 'sent',
    cardKind: 'generic-amber',
    event: 'CIMI360 2026',
  },
];

// =========================================
// MAIN
// =========================================
export default function App() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
    return () => {
      try { document.head.removeChild(link); } catch (e) {}
    };
  }, []);

  return (
    <div
      style={{
        fontFamily: FONT_STACK,
        background: COLORS.pageBg,
        minHeight: '100vh',
        padding: '20px 12px 40px',
      }}
    >
      {/* PHONE FRAME */}
      <div
        style={{
          maxWidth: 393,
          margin: '0 auto',
          background: '#0A0A0A',
          borderRadius: 46,
          padding: 11,
          boxShadow:
            '0 30px 80px rgba(0,0,0,0.22), 0 6px 12px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            background: COLORS.appBg,
            borderRadius: 36,
            overflow: 'hidden',
            height: 760,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* STATUS BAR */}
          <div
            style={{
              background: COLORS.azulNoturno,
              height: 42,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 28px',
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <span>9:41</span>
            <span style={{ fontSize: 11, opacity: 0.9, letterSpacing: 1 }}>
              ●●● 5G ◐
            </span>
          </div>

          {/* USER BAR + WORDMARK (combined header) */}
          <header
            style={{
              background: 'white',
              flexShrink: 0,
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            {/* User row */}
            <div
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  background: COLORS.azulNoturno,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                  letterSpacing: 0.5,
                }}
              >
                CM
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: COLORS.azulNoturno,
                    lineHeight: 1.2,
                  }}
                >
                  Camila Martins
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: COLORS.textMuted,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 2,
                  }}
                >
                  <Mail size={11} strokeWidth={2.2} />
                  <span>3 / 2000 enviados hoje</span>
                </div>
              </div>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 8,
                  cursor: 'pointer',
                  color: COLORS.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: FONT_STACK,
                  fontSize: 12,
                  fontWeight: 600,
                }}
                aria-label="Sair"
              >
                <LogOut size={15} strokeWidth={2} />
                <span>Sair</span>
              </button>
            </div>

            {/* Wordmark — provisório no padrão das sub-marcas CIMI */}
            <div
              style={{
                padding: '4px 16px 14px',
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: COLORS.laranja360,
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                cimi
              </span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: COLORS.azulNoturno,
                  letterSpacing: 1.5,
                  lineHeight: 1,
                }}
              >
                LEADS
              </span>
            </div>
          </header>

          {/* SCROLLABLE CONTENT */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* SECTION: ESCANEIE UM CONTATO */}
            <div style={{ padding: '18px 16px 8px' }}>
              <SectionLabel>Escaneie um contato</SectionLabel>
              <CaptureCard
                variant="primary"
                icon={Camera}
                title="Cartão de Visita"
                subtitle="Tire uma foto e extraia os dados"
              />
              <div style={{ height: 10 }} />
              <CaptureCard
                variant="secondary"
                icon={QrCode}
                title="QR Code"
                subtitle="Aponte para um código QR"
              />
              <div style={{ height: 10 }} />
              <CaptureCard
                variant="tertiary"
                icon={Layers}
                title="Modo Rajada"
                subtitle="Várias fotos, processadas depois"
              />
            </div>

            {/* SECTION: CONTATOS */}
            <div style={{ padding: '18px 16px 8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <SectionLabel noMargin>
                  Contatos
                  <span
                    style={{
                      color: COLORS.textSubtle,
                      fontWeight: 600,
                      marginLeft: 6,
                    }}
                  >
                    284
                  </span>
                </SectionLabel>
                <div style={{ display: 'flex', gap: 8 }}>
                  <IconButton aria-label="Filtros">
                    <Filter size={15} strokeWidth={2} />
                  </IconButton>
                  <IconButton aria-label="Exportar CSV">
                    <Download size={15} strokeWidth={2} />
                  </IconButton>
                </div>
              </div>

              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Search
                  size={16}
                  strokeWidth={2}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: COLORS.textSubtle,
                  }}
                />
                <input
                  placeholder="Buscar por nome ou empresa..."
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    background: 'white',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    fontSize: 13,
                    fontFamily: FONT_STACK,
                    color: COLORS.text,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Contact list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {CONTACTS.map((c) => (
                  <ContactCard key={c.id} contact={c} />
                ))}
              </div>
            </div>

            {/* FOOTER — Powered by Gyros (sutil) */}
            <Footer />
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 393,
          margin: '14px auto 0',
          fontSize: 11,
          color: COLORS.textSubtle,
          textAlign: 'center',
          lineHeight: 1.5,
          padding: '0 12px',
        }}
      >
        Home redesenhada · viewport 393×760 · 3 modos com hierarquia clara · 5
        contatos cobrindo estados diversos
      </div>
    </div>
  );
}

// =========================================
// SECTIONS / HELPERS
// =========================================
function SectionLabel({ children, noMargin }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: COLORS.azulNoturno,
        marginBottom: noMargin ? 0 : 12,
      }}
    >
      {children}
    </div>
  );
}

function IconButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        width: 34,
        height: 34,
        background: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: COLORS.azulNoturno,
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

// =========================================
// CAPTURE CARDS — 3 variantes com hierarquia
// =========================================
function CaptureCard({ variant, icon: Icon, title, subtitle }) {
  const styles = {
    primary: {
      background: COLORS.laranja360,
      color: 'white',
      borderColor: COLORS.laranja360,
      iconBg: 'rgba(255,255,255,0.18)',
      iconColor: 'white',
      titleColor: 'white',
      subtitleColor: 'rgba(255,255,255,0.82)',
      chevronColor: 'rgba(255,255,255,0.7)',
      shadow: '0 8px 20px rgba(250,104,0,0.25)',
    },
    secondary: {
      background: 'white',
      color: COLORS.azulNoturno,
      borderColor: COLORS.border,
      iconBg: '#FFF0E5',
      iconColor: COLORS.laranja360,
      titleColor: COLORS.azulNoturno,
      subtitleColor: COLORS.textMuted,
      chevronColor: COLORS.borderStrong,
      shadow: 'none',
    },
    tertiary: {
      background: COLORS.surfaceMuted,
      color: COLORS.azulNoturno,
      borderColor: COLORS.border,
      iconBg: 'white',
      iconColor: COLORS.textMuted,
      titleColor: COLORS.azulNoturno,
      subtitleColor: COLORS.textMuted,
      chevronColor: COLORS.borderStrong,
      shadow: 'none',
    },
  }[variant];

  return (
    <button
      style={{
        width: '100%',
        background: styles.background,
        border: `1px solid ${styles.borderColor}`,
        borderRadius: 14,
        padding: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
        fontFamily: FONT_STACK,
        textAlign: 'left',
        boxShadow: styles.shadow,
        transition: 'transform 0.1s',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: styles.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: styles.iconColor,
          flexShrink: 0,
        }}
      >
        <Icon size={22} strokeWidth={1.9} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: styles.titleColor,
            letterSpacing: -0.1,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: styles.subtitleColor,
            marginTop: 2,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>
      </div>
      <ChevronRight size={18} strokeWidth={2} color={styles.chevronColor} />
    </button>
  );
}

// =========================================
// CONTACT CARD
// =========================================
function ContactCard({ contact }) {
  return (
    <div
      role="button"
      tabIndex={0}
      style={{
        background: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: 12,
        display: 'flex',
        gap: 12,
        cursor: 'pointer',
        fontFamily: FONT_STACK,
      }}
    >
      <CardThumb kind={contact.cardKind} name={contact.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row: name + stars */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: COLORS.azulNoturno,
              lineHeight: 1.25,
              letterSpacing: -0.1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {contact.name}
          </div>
          <StarRow count={contact.importance} />
        </div>

        {/* Empresa · cargo */}
        <div
          style={{
            fontSize: 12,
            color: COLORS.textMuted,
            marginTop: 2,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontWeight: 600, color: COLORS.text }}>
            {contact.company}
          </span>
          {contact.role && (
            <span style={{ color: COLORS.textSubtle }}> · {contact.role}</span>
          )}
        </div>

        {/* Classification chips */}
        {contact.classifications.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 5,
              marginTop: 8,
            }}
          >
            {contact.classifications.map((cls, idx) => (
              <ClassificationChip key={idx} cls={cls} />
            ))}
          </div>
        )}

        {/* Status row */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <SyncBadge status={contact.syncStatus} />
          <EmailBadge status={contact.emailStatus} />
        </div>
      </div>
    </div>
  );
}

function CardThumb({ kind, name }) {
  const styles = {
    gyros: {
      bg: 'linear-gradient(135deg, #4A1F75 0%, #2D1352 100%)',
      content: (
        <span
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontSize: 13,
            fontWeight: 600,
            color: 'white',
            letterSpacing: 2,
            opacity: 0.92,
          }}
        >
          GYROS
        </span>
      ),
    },
    'generic-blue': {
      bg: 'linear-gradient(135deg, #1E40AF 0%, #0F2A6B 100%)',
      content: (
        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: 700 }}>
          {initials(name)}
        </span>
      ),
    },
    'generic-green': {
      bg: 'linear-gradient(135deg, #14635E 0%, #0A3D3A 100%)',
      content: (
        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: 700 }}>
          {initials(name)}
        </span>
      ),
    },
    'generic-amber': {
      bg: 'linear-gradient(135deg, #A16207 0%, #6B3E03 100%)',
      content: (
        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: 700 }}>
          {initials(name)}
        </span>
      ),
    },
    qr: {
      bg: COLORS.surfaceMuted,
      content: (
        <QrCode size={28} strokeWidth={1.4} color={COLORS.textMuted} />
      ),
    },
  }[kind];

  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 10,
        background: styles.bg,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        border: kind === 'qr' ? `1px solid ${COLORS.border}` : 'none',
      }}
    >
      {styles.content}
    </div>
  );
}

function initials(name) {
  return name
    .split(' ')
    .filter((p) => p.length > 1)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function StarRow({ count }) {
  if (count === 0) {
    return (
      <div style={{ display: 'flex', gap: 1 }}>
        {[0, 1, 2].map((i) => (
          <Star
            key={i}
            size={12}
            strokeWidth={1.6}
            color={COLORS.borderStrong}
            fill="none"
          />
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          size={12}
          strokeWidth={1.6}
          color={i < count ? COLORS.laranja360 : COLORS.borderStrong}
          fill={i < count ? COLORS.laranja360 : 'none'}
        />
      ))}
    </div>
  );
}

function ClassificationChip({ cls }) {
  const palette = {
    invest: {
      label: 'Invest',
      color: COLORS.azulAtlantico,
      bg: '#E8F5F6',
      border: '#B7DEE0',
    },
    cimi360: {
      label: '360',
      color: COLORS.laranja360,
      bg: '#FFF0E5',
      border: '#FFD4B5',
    },
  }[cls.type];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 6,
        fontSize: 10.5,
        fontWeight: 700,
        color: COLORS.azulNoturno,
        letterSpacing: 0.3,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: palette.color,
          flexShrink: 0,
        }}
      />
      <span style={{ textTransform: 'uppercase' }}>{palette.label}</span>
      <span style={{ color: COLORS.textMuted, fontWeight: 600 }}>·</span>
      <span>{cls.sub}</span>
    </div>
  );
}

function SyncBadge({ status }) {
  if (status === 'synced') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          color: COLORS.success,
          fontWeight: 600,
        }}
      >
        <Cloud size={12} strokeWidth={2.2} />
        <span>Sincronizado</span>
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        color: COLORS.warning,
        fontWeight: 600,
      }}
    >
      <CloudOff size={12} strokeWidth={2.2} />
      <span>Sync pendente</span>
    </div>
  );
}

function EmailBadge({ status }) {
  if (status === 'sent') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          color: COLORS.success,
          fontWeight: 600,
        }}
      >
        <MailCheck size={12} strokeWidth={2.2} />
        <span>Mídia kit enviado</span>
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          color: COLORS.danger,
          fontWeight: 600,
        }}
      >
        <AlertCircle size={12} strokeWidth={2.2} />
        <span>Falha no envio</span>
      </div>
    );
  }
  if (status === 'skipped') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          color: COLORS.textSubtle,
          fontWeight: 600,
        }}
      >
        <Mail size={12} strokeWidth={2.2} />
        <span>Não enviado</span>
      </div>
    );
  }
  // pending
  return null;
}

// =========================================
// FOOTER — Powered by Gyros
// =========================================
function Footer() {
  return (
    <div
      style={{
        padding: '32px 16px 28px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 28,
          height: 1,
          background: COLORS.border,
          margin: '0 auto 14px',
        }}
      />
      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: COLORS.textSubtle,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        Desenvolvido por
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: COLORS.laranja360,
          letterSpacing: 0.4,
        }}
      >
        Gyros AI Solutions
      </div>
    </div>
  );
}
