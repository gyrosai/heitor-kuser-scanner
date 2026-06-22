import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Trash2,
  Camera,
  Sparkles,
  ChevronRight,
  Check,
  Clock,
  AlertCircle,
  Plus,
} from 'lucide-react';

// =========================================
// DESIGN TOKENS
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
  warning: '#92400E',
  warningBg: '#FEF3E0',
  warningBorder: '#FBD9A5',
  danger: '#B91C1C',
};

const FONT_STACK = '"Montserrat", system-ui, -apple-system, sans-serif';

// =========================================
// MOCK QUEUE DATA
// =========================================
const PENDING_CAPTURES = [
  { id: 1, time: '22:01', card: 'purple', size: '1.2 MB' },
  { id: 2, time: '22:03', card: 'blue', size: '980 KB' },
  { id: 3, time: '22:04', card: 'amber', size: '1.4 MB' },
  { id: 4, time: '22:07', card: 'teal', size: '1.1 MB' },
  { id: 5, time: '22:09', card: 'purple', size: '1.3 MB' },
  { id: 6, time: '22:11', card: 'amber', size: '870 KB' },
  { id: 7, time: '22:14', card: 'blue', size: '1.5 MB' },
  { id: 8, time: '22:18', card: 'teal', size: '1.0 MB' },
];

const PROCESSED_CAPTURES = [
  {
    id: 101,
    name: 'João Pereira da Silva',
    company: 'Mendes Imóveis',
    role: 'Diretor Comercial',
    time: '21:42',
    card: 'blue',
  },
  {
    id: 102,
    name: 'Ana Carolina Lima',
    company: 'Lima Investimentos',
    role: 'Founder',
    time: '21:45',
    card: 'amber',
  },
  {
    id: 103,
    name: 'Roberto Alves',
    company: 'Alves & Cia',
    role: 'CEO',
    time: '21:51',
    card: 'teal',
  },
  {
    id: 104,
    name: 'Patrícia Mendes',
    company: 'PM Consultoria',
    role: 'Sócia-fundadora',
    time: '21:58',
    card: 'purple',
  },
];

// =========================================
// MAIN
// =========================================
export default function App() {
  const [demoState, setDemoState] = useState('pending'); // 'empty' | 'pending' | 'processed'
  const [activeTab, setActiveTab] = useState('pending');

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

  // Sync demoState com a tab visível
  useEffect(() => {
    if (demoState === 'processed') setActiveTab('processed');
    else setActiveTab('pending');
  }, [demoState]);

  const pendingCount = demoState === 'empty' ? 0 : PENDING_CAPTURES.length;
  const processedCount = demoState === 'empty' ? 0 : PROCESSED_CAPTURES.length;

  return (
    <div
      style={{
        fontFamily: FONT_STACK,
        background: COLORS.pageBg,
        minHeight: '100vh',
        padding: '20px 12px 40px',
      }}
    >
      {/* SWITCHER */}
      <div style={{ maxWidth: 420, margin: '0 auto 18px' }}>
        <div
          style={{
            background: 'white',
            borderRadius: 14,
            padding: '12px 14px',
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: COLORS.azulNoturno,
              marginBottom: 10,
            }}
          >
            Estado da fila · troque pra ver
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { v: 'empty', l: 'Vazia' },
              { v: 'pending', l: 'Capturadas' },
              { v: 'processed', l: 'Processadas' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setDemoState(opt.v)}
                style={{
                  flex: 1,
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: FONT_STACK,
                  fontSize: 12,
                  fontWeight: 700,
                  background:
                    demoState === opt.v ? COLORS.azulNoturno : COLORS.appBg,
                  color: demoState === opt.v ? 'white' : COLORS.textMuted,
                  letterSpacing: 0.3,
                  transition: 'all 0.15s',
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PHONE */}
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

          {/* HEADER */}
          <header
            style={{
              background: 'white',
              padding: '12px 8px 12px 4px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              borderBottom: `1px solid ${COLORS.border}`,
              flexShrink: 0,
            }}
          >
            <button
              style={{
                background: 'none',
                border: 'none',
                padding: 10,
                cursor: 'pointer',
                color: COLORS.azulNoturno,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 8,
              }}
              aria-label="Voltar"
            >
              <ChevronLeft size={22} strokeWidth={2.2} />
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <h1
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: COLORS.azulNoturno,
                  margin: 0,
                  letterSpacing: -0.2,
                  lineHeight: 1.2,
                }}
              >
                Fila de scans
              </h1>
              {(pendingCount + processedCount) > 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: COLORS.textMuted,
                    fontWeight: 600,
                    marginTop: 1,
                  }}
                >
                  Modo Rajada
                </div>
              )}
            </div>
            {pendingCount > 0 ? (
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 10,
                  cursor: 'pointer',
                  color: COLORS.danger,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 8,
                }}
                aria-label="Apagar fila"
              >
                <Trash2 size={18} strokeWidth={2} />
              </button>
            ) : (
              <div style={{ width: 42 }} />
            )}
          </header>

          {/* STATS ROW — só se tem fotos */}
          {(pendingCount + processedCount) > 0 && (
            <div
              style={{
                background: 'white',
                padding: '14px 16px',
                display: 'flex',
                gap: 10,
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <StatCard
                label="Total"
                value={pendingCount + processedCount}
                color={COLORS.azulNoturno}
              />
              <StatCard
                label="Aguardando"
                value={pendingCount}
                color={COLORS.laranja360}
                emphasis
              />
              <StatCard
                label="Processadas"
                value={processedCount}
                color={COLORS.success}
              />
            </div>
          )}

          {/* TABS — só se tem fotos */}
          {(pendingCount + processedCount) > 0 && (
            <div
              style={{
                background: 'white',
                padding: '8px 16px 14px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  background: COLORS.appBg,
                  borderRadius: 10,
                  padding: 4,
                  display: 'flex',
                  gap: 4,
                }}
              >
                <TabButton
                  active={activeTab === 'pending'}
                  onClick={() => setActiveTab('pending')}
                  count={pendingCount}
                >
                  Capturadas
                </TabButton>
                <TabButton
                  active={activeTab === 'processed'}
                  onClick={() => setActiveTab('processed')}
                  count={processedCount}
                >
                  Processadas
                </TabButton>
              </div>
            </div>
          )}

          {/* CONTENT */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* ESTADO VAZIO */}
            {demoState === 'empty' && <EmptyState />}

            {/* TAB CAPTURADAS */}
            {demoState !== 'empty' && activeTab === 'pending' && (
              <PendingList items={PENDING_CAPTURES} />
            )}

            {/* TAB PROCESSADAS */}
            {demoState !== 'empty' && activeTab === 'processed' && (
              <ProcessedList items={PROCESSED_CAPTURES} />
            )}
          </div>

          {/* BOTTOM ACTIONS */}
          <BottomBar
            state={demoState}
            activeTab={activeTab}
            pendingCount={pendingCount}
          />
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
        Fila de scans · stats compactos · tabs como segmented control mobile ·
        empty state com CTA pra abrir câmera · processar em lote no bottom
      </div>
    </div>
  );
}

// =========================================
// STAT CARD
// =========================================
function StatCard({ label, value, color, emphasis }) {
  return (
    <div
      style={{
        flex: 1,
        background: emphasis ? `${color}0F` : COLORS.appBg,
        border: `1px solid ${emphasis ? `${color}40` : COLORS.border}`,
        borderRadius: 10,
        padding: '10px 8px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color,
          lineHeight: 1,
          letterSpacing: -0.6,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: COLORS.textMuted,
          marginTop: 4,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}

// =========================================
// TAB BUTTON
// =========================================
function TabButton({ active, onClick, count, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '9px 12px',
        background: active ? 'white' : 'transparent',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: FONT_STACK,
        fontSize: 13,
        fontWeight: 700,
        color: active ? COLORS.azulNoturno : COLORS.textMuted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.15s',
        letterSpacing: -0.1,
      }}
    >
      <span>{children}</span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: active ? COLORS.textMuted : COLORS.textSubtle,
          background: active ? COLORS.appBg : 'transparent',
          padding: active ? '1px 6px' : '0',
          borderRadius: 999,
          minWidth: 18,
          textAlign: 'center',
        }}
      >
        {count}
      </span>
    </button>
  );
}

// =========================================
// EMPTY STATE
// =========================================
function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        height: '100%',
        textAlign: 'center',
      }}
    >
      {/* Ícone — sóbrio, não decorativo */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'white',
          border: `1px solid ${COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          color: COLORS.laranja360,
        }}
      >
        <Camera size={28} strokeWidth={1.7} />
      </div>

      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: COLORS.azulNoturno,
          marginBottom: 6,
          letterSpacing: -0.2,
        }}
      >
        Nenhuma captura ainda
      </div>
      <div
        style={{
          fontSize: 13,
          color: COLORS.textMuted,
          lineHeight: 1.55,
          maxWidth: 260,
          marginBottom: 28,
        }}
      >
        Capture vários cartões em sequência. Você processa todos quando
        quiser, sem precisar revisar um a um durante o evento.
      </div>

      <button
        style={{
          background: COLORS.laranja360,
          color: 'white',
          border: 'none',
          borderRadius: 12,
          padding: '14px 24px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: FONT_STACK,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 48,
          boxShadow: '0 6px 16px rgba(250,104,0,0.22)',
        }}
      >
        <Camera size={16} strokeWidth={2.2} />
        Abrir câmera
      </button>
    </div>
  );
}

// =========================================
// PENDING LIST — fotos aguardando OCR
// =========================================
function PendingList({ items }) {
  return (
    <div style={{ padding: '14px 16px 100px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 12,
          fontSize: 11,
          color: COLORS.textMuted,
          fontWeight: 600,
        }}
      >
        <Clock size={12} strokeWidth={2.2} />
        <span>Aguardando processamento (OCR + extração)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => (
          <PendingItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function PendingItem({ item }) {
  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <CardThumb kind={item.card} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: COLORS.azulNoturno,
            letterSpacing: -0.1,
          }}
        >
          Capturado às {item.time}
        </div>
        <div
          style={{
            fontSize: 11,
            color: COLORS.textMuted,
            marginTop: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{item.size}</span>
          <span style={{ color: COLORS.textSubtle }}>·</span>
          <span
            style={{
              color: COLORS.warning,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Clock size={10} strokeWidth={2.4} />
            Aguardando
          </span>
        </div>
      </div>
      <button
        style={{
          background: 'white',
          border: `1px solid ${COLORS.laranja360}`,
          color: COLORS.laranja360,
          borderRadius: 8,
          padding: '7px 12px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: FONT_STACK,
          minHeight: 34,
          flexShrink: 0,
        }}
      >
        Processar
      </button>
    </div>
  );
}

// =========================================
// PROCESSED LIST — contatos extraídos
// =========================================
function ProcessedList({ items }) {
  return (
    <div style={{ padding: '14px 16px 24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 12,
          fontSize: 11,
          color: COLORS.textMuted,
          fontWeight: 600,
        }}
      >
        <Check size={12} strokeWidth={2.4} color={COLORS.success} />
        <span>Contatos extraídos e salvos</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => (
          <ProcessedItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function ProcessedItem({ item }) {
  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <CardThumb kind={item.card} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: COLORS.azulNoturno,
            letterSpacing: -0.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: COLORS.textMuted,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontWeight: 600, color: COLORS.text }}>
            {item.company}
          </span>
          <span style={{ color: COLORS.textSubtle }}> · {item.role}</span>
        </div>
        <div
          style={{
            fontSize: 10,
            color: COLORS.textSubtle,
            marginTop: 3,
            fontWeight: 600,
            letterSpacing: 0.3,
          }}
        >
          Processado às {item.time}
        </div>
      </div>
      <ChevronRight
        size={16}
        strokeWidth={2}
        color={COLORS.borderStrong}
        style={{ flexShrink: 0 }}
      />
    </div>
  );
}

// =========================================
// CARD THUMB
// =========================================
function CardThumb({ kind, size = 56 }) {
  const gradients = {
    purple: 'linear-gradient(135deg, #4A1F75 0%, #2D1352 100%)',
    blue: 'linear-gradient(135deg, #1E40AF 0%, #0F2A6B 100%)',
    teal: 'linear-gradient(135deg, #14635E 0%, #0A3D3A 100%)',
    amber: 'linear-gradient(135deg, #A16207 0%, #6B3E03 100%)',
  };

  return (
    <div
      style={{
        width: size,
        height: Math.round(size * 0.66),
        borderRadius: 6,
        background: gradients[kind] || gradients.purple,
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    />
  );
}

// =========================================
// BOTTOM BAR
// =========================================
function BottomBar({ state, activeTab, pendingCount }) {
  // Vazio: já tem CTA no empty state, sem bottom bar
  if (state === 'empty') return null;

  // Capturadas com itens: processar todas
  if (activeTab === 'pending' && pendingCount > 0) {
    return (
      <div
        style={{
          background: 'white',
          borderTop: `1px solid ${COLORS.border}`,
          padding: '12px 16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flexShrink: 0,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
        }}
      >
        <button
          style={{
            width: '100%',
            background: COLORS.laranja360,
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '15px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: FONT_STACK,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 50,
            letterSpacing: -0.1,
          }}
        >
          <Sparkles size={16} strokeWidth={2.2} />
          Processar todas ({pendingCount})
        </button>
        <button
          style={{
            width: '100%',
            background: 'none',
            border: `1px solid ${COLORS.border}`,
            color: COLORS.azulNoturno,
            borderRadius: 12,
            padding: '11px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: FONT_STACK,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            minHeight: 42,
          }}
        >
          <Plus size={14} strokeWidth={2.4} />
          Capturar mais
        </button>
      </div>
    );
  }

  // Tab Processadas — só botão pra capturar mais
  return (
    <div
      style={{
        background: 'white',
        borderTop: `1px solid ${COLORS.border}`,
        padding: '12px 16px 14px',
        flexShrink: 0,
      }}
    >
      <button
        style={{
          width: '100%',
          background: COLORS.laranja360,
          color: 'white',
          border: 'none',
          borderRadius: 12,
          padding: '14px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: FONT_STACK,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          minHeight: 48,
          letterSpacing: -0.1,
        }}
      >
        <Camera size={16} strokeWidth={2.2} />
        Capturar mais
      </button>
    </div>
  );
}
