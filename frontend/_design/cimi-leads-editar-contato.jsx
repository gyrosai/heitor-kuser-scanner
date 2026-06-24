import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Star,
  MailCheck,
  RefreshCw,
  Mic,
  AlertCircle,
  Check,
} from 'lucide-react';

// =========================================
// DESIGN TOKENS — derivados do brand CIMI360
// =========================================
const COLORS = {
  // Brand
  laranja360: '#FA6800',
  laranjaAmbar: '#FD9E02',
  azulAtlantico: '#34A9AD',
  azulNoturno: '#002F3F',
  // Surfaces
  pageBg: '#EFEFF2',
  appBg: '#F4F4F6',
  surface: '#FFFFFF',
  surfaceMuted: '#F8F8FA',
  // Borders
  border: '#E5E5E8',
  borderStrong: '#C9C9D0',
  // Text
  text: '#1A1A1A',
  textMuted: '#5C5C66',
  textSubtle: '#9090A0',
  // States
  success: '#1B7F47',
  successBg: '#E8F5EC',
  successBorder: '#BBE2C8',
  danger: '#B91C1C',
  dangerBg: '#FDECEC',
  dangerBorder: '#F5C2C2',
};

const FONT_STACK = '"Montserrat", system-ui, -apple-system, sans-serif';

const INTEREST_TYPES = [
  'Patrocínio',
  'Instrutor',
  'Parceria',
  'Cliente',
  'Mídia',
  'Follow-up',
];

// =========================================
// MAIN
// =========================================
export default function App() {
  const [demoState, setDemoState] = useState('pending');

  // Form state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailLang, setEmailLang] = useState('pt');
  const [interest, setInterest] = useState('Instrutor');
  const [importance, setImportance] = useState(2);
  const [invest, setInvest] = useState({ active: true, sub: 'parceria' });
  const [cimi360, setCimi360] = useState({ active: true, sub: 'stand' });

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
      {/* DEMO SWITCHER (fora do phone) */}
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
            Estado da seção Mídia Kit · troque pra ver
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { v: 'pending', l: 'Pendente' },
              { v: 'sent', l: 'Enviado' },
              { v: 'failed', l: 'Falhou' },
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

      {/* PHONE FRAME */}
      <div
        style={{
          maxWidth: 393,
          margin: '0 auto',
          background: '#0A0A0A',
          borderRadius: 46,
          padding: 11,
          boxShadow: '0 30px 80px rgba(0,0,0,0.22), 0 6px 12px rgba(0,0,0,0.08)',
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

          {/* APP HEADER */}
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
            <h1
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: 700,
                color: COLORS.azulNoturno,
                margin: 0,
                letterSpacing: -0.2,
                textAlign: 'center',
                paddingRight: 44,
              }}
            >
              Editar contato
            </h1>
          </header>

          {/* SCROLLABLE CONTENT */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* HERO — thumb cartão */}
            <div style={{ padding: '16px 20px 4px' }}>
              <div
                style={{
                  aspectRatio: '16 / 10',
                  background:
                    'linear-gradient(135deg, #4A1F75 0%, #2D1352 100%)',
                  borderRadius: 14,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                <div
                  style={{
                    fontFamily: '"Fraunces", Georgia, serif',
                    fontSize: 32,
                    fontWeight: 600,
                    letterSpacing: 5,
                    opacity: 0.9,
                  }}
                >
                  GYROS
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    right: 12,
                    background: 'rgba(255,255,255,0.16)',
                    backdropFilter: 'blur(6px)',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '4px 9px',
                    borderRadius: 6,
                    fontFamily: FONT_STACK,
                    letterSpacing: 0.8,
                  }}
                >
                  CARTÃO ESCANEADO
                </div>
              </div>
            </div>

            {/* SECTIONS */}
            <Section title="Dados do contato">
              <Field label="Nome" value="Camila Martins" required />
              <Field label="E-mail" value="camila@gyrosai.com" />
              <Field label="Telefone" value="+55 21 95949-7461" />
              <Field label="Empresa" value="GYROS" />
              <Field label="Cargo" value="Founder & CEO" />
            </Section>

            <Divider />

            <Section title="Importância">
              <div style={{ display: 'flex', gap: 12 }}>
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    onClick={() => setImportance(i + 1)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color:
                        i < importance ? COLORS.laranja360 : COLORS.borderStrong,
                      transition: 'color 0.15s',
                    }}
                    aria-label={`Importância ${i + 1}`}
                  >
                    <Star
                      size={34}
                      fill={i < importance ? COLORS.laranja360 : 'none'}
                      strokeWidth={1.6}
                    />
                  </button>
                ))}
              </div>
            </Section>

            <Divider />

            <Section title="Tipo de interesse">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {INTEREST_TYPES.map((it) => (
                  <Chip
                    key={it}
                    active={interest === it}
                    onClick={() =>
                      setInterest(interest === it ? null : it)
                    }
                  >
                    {it}
                  </Chip>
                ))}
              </div>
            </Section>

            <Divider />

            <Section title="Classificação CIMI">
              <ClassificationCard
                label="CIMI Invest"
                color={COLORS.azulAtlantico}
                active={invest.active}
                onToggle={() =>
                  setInvest({ ...invest, active: !invest.active })
                }
                options={['Parceria', 'Venda']}
                selected={invest.sub}
                onSelect={(s) =>
                  setInvest({ ...invest, sub: s.toLowerCase() })
                }
              />
              <div style={{ height: 10 }} />
              <ClassificationCard
                label="CIMI 360"
                color={COLORS.laranja360}
                active={cimi360.active}
                onToggle={() =>
                  setCimi360({ ...cimi360, active: !cimi360.active })
                }
                options={['Stand', 'Patrocínio']}
                selected={cimi360.sub}
                onSelect={(s) =>
                  setCimi360({ ...cimi360, sub: s.toLowerCase() })
                }
              />
            </Section>

            <Divider />

            {/* SEÇÃO CRÍTICA — MÍDIA KIT POR E-MAIL */}
            <Section title="Mídia Kit por e-mail">
              <EmailKitSection
                state={demoState}
                enabled={emailEnabled}
                onToggle={() => setEmailEnabled(!emailEnabled)}
                lang={emailLang}
                onLangChange={setEmailLang}
              />
            </Section>

            <Divider />

            <Section title="Observações">
              <button
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'white',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.azulNoturno,
                  cursor: 'pointer',
                  fontFamily: FONT_STACK,
                }}
              >
                <Mic size={16} strokeWidth={2} />
                Gravar áudio
              </button>
              <textarea
                placeholder="Notas sobre o contato..."
                rows={3}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: 12,
                  background: 'white',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  fontSize: 14,
                  fontFamily: FONT_STACK,
                  color: COLORS.text,
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </Section>

            <Divider />

            <Section title="Evento">
              <Field value="Pré-Evento Teste 2026" />
            </Section>

            <div style={{ height: 20 }} />
          </div>

          {/* BOTTOM ACTIONS */}
          <div
            style={{
              background: 'white',
              borderTop: `1px solid ${COLORS.border}`,
              padding: '12px 16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
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
                letterSpacing: -0.1,
                minHeight: 50,
              }}
            >
              {demoState === 'pending' && emailEnabled
                ? 'Salvar e enviar Mídia Kit'
                : 'Salvar alterações'}
            </button>
            <button
              style={{
                width: '100%',
                background: 'none',
                color: COLORS.danger,
                border: 'none',
                padding: '12px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: FONT_STACK,
              }}
            >
              Excluir contato
            </button>
          </div>
        </div>
      </div>

      {/* CAPTION */}
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
        viewport 393×760 · Montserrat · brand CIMI360 · botão primário muda de
        cópia conforme o checkbox
      </div>
    </div>
  );
}

// =========================================
// SUB-COMPONENTS
// =========================================
function Section({ title, children }) {
  return (
    <div style={{ padding: '20px 20px 6px' }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: COLORS.azulNoturno,
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: COLORS.border,
        margin: '6px 20px',
      }}
    />
  );
}

function Field({ label, value, required }) {
  return (
    <div style={{ marginBottom: label ? 12 : 0 }}>
      {label && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: COLORS.textMuted,
            marginBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {label}
          {required && (
            <span style={{ color: COLORS.laranja360, fontWeight: 700 }}>*</span>
          )}
        </div>
      )}
      <input
        type="text"
        defaultValue={value}
        style={{
          width: '100%',
          padding: '13px 14px',
          background: 'white',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          fontSize: 15,
          fontFamily: FONT_STACK,
          fontWeight: 500,
          color: COLORS.text,
          outline: 'none',
          boxSizing: 'border-box',
          minHeight: 48,
        }}
      />
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 14px',
        background: active ? COLORS.azulNoturno : 'white',
        color: active ? 'white' : COLORS.azulNoturno,
        border: `1px solid ${active ? COLORS.azulNoturno : COLORS.border}`,
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: FONT_STACK,
        minHeight: 36,
        letterSpacing: 0.1,
      }}
    >
      {children}
    </button>
  );
}

function ClassificationCard({
  label,
  color,
  active,
  onToggle,
  options,
  selected,
  onSelect,
}) {
  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${active ? color : COLORS.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '14px 14px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          fontFamily: FONT_STACK,
          textAlign: 'left',
          minHeight: 56,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: active ? color : 'white',
            border: active ? 'none' : `1.5px solid ${COLORS.borderStrong}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {active && <Check size={14} color="white" strokeWidth={3} />}
        </div>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: COLORS.azulNoturno,
            flex: 1,
          }}
        >
          {label}
        </span>
      </button>
      {active && (
        <div
          style={{
            padding: '0 14px 14px 46px',
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: FONT_STACK,
                minHeight: 32,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: `1.5px solid ${
                    selected === opt.toLowerCase()
                      ? color
                      : COLORS.borderStrong
                  }`,
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {selected === opt.toLowerCase() && (
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: color,
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: COLORS.text,
                }}
              >
                {opt}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmailKitSection({ state, enabled, onToggle, lang, onLangChange }) {
  // ESTADO: ENVIADO
  if (state === 'sent') {
    return (
      <div
        style={{
          background: COLORS.successBg,
          border: `1px solid ${COLORS.successBorder}`,
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid ${COLORS.successBorder}`,
            }}
          >
            <MailCheck size={18} color={COLORS.success} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: COLORS.success,
                marginBottom: 6,
              }}
            >
              Mídia Kit enviado
            </div>
            <div
              style={{
                fontSize: 13,
                color: COLORS.text,
                lineHeight: 1.5,
              }}
            >
              21 de junho, 14:32 · idioma PT-BR
            </div>
            <div
              style={{
                fontSize: 13,
                color: COLORS.textMuted,
                lineHeight: 1.5,
              }}
            >
              Para camila@gyrosai.com
            </div>
            <button
              style={{
                marginTop: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                background: 'white',
                border: `1px solid ${COLORS.successBorder}`,
                borderRadius: 8,
                color: COLORS.success,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: FONT_STACK,
                minHeight: 38,
              }}
            >
              <RefreshCw size={14} strokeWidth={2.2} />
              Reenviar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ESTADO: FALHOU
  if (state === 'failed') {
    return (
      <div
        style={{
          background: COLORS.dangerBg,
          border: `1px solid ${COLORS.dangerBorder}`,
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid ${COLORS.dangerBorder}`,
            }}
          >
            <AlertCircle size={18} color={COLORS.danger} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: COLORS.danger,
                marginBottom: 6,
              }}
            >
              Falha no envio
            </div>
            <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>
              21 de junho, 14:32
            </div>
            <div
              style={{
                fontSize: 13,
                color: COLORS.textMuted,
                lineHeight: 1.5,
                marginTop: 4,
              }}
            >
              Quota diária do Gmail esgotada (2000/2000). Tente novamente após
              meia-noite.
            </div>
            <button
              style={{
                marginTop: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                background: 'white',
                border: `1px solid ${COLORS.dangerBorder}`,
                borderRadius: 8,
                color: COLORS.danger,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: FONT_STACK,
                minHeight: 38,
              }}
            >
              <RefreshCw size={14} strokeWidth={2.2} />
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ESTADO: PENDENTE (default)
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '14px',
          background: 'white',
          border: `1px solid ${enabled ? COLORS.laranja360 : COLORS.border}`,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          fontFamily: FONT_STACK,
          textAlign: 'left',
          minHeight: 64,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: enabled ? COLORS.laranja360 : 'white',
            border: enabled ? 'none' : `1.5px solid ${COLORS.borderStrong}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {enabled && <Check size={14} color="white" strokeWidth={3} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: COLORS.azulNoturno,
              marginBottom: 2,
            }}
          >
            Enviar Mídia Kit ao salvar
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>
            PDF anexo · disparado pelo seu Gmail
          </div>
        </div>
      </button>

      {enabled && (
        <div
          style={{
            marginTop: 10,
            padding: '4px 14px',
            background: 'white',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
          }}
        >
          <PreviewRow label="Para">
            <span style={{ fontWeight: 700, color: COLORS.text, fontSize: 14 }}>
              Camila Martins
            </span>
            <div
              style={{
                color: COLORS.textMuted,
                fontSize: 13,
                marginTop: 2,
              }}
            >
              camila@gyrosai.com
            </div>
          </PreviewRow>
          <PreviewRow label="De">
            <span style={{ color: COLORS.text, fontSize: 13 }}>
              camila@gyrosai.com
            </span>
          </PreviewRow>
          <PreviewRow label="Idioma" last>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { v: 'pt', l: 'PT' },
                { v: 'en', l: 'EN' },
                { v: 'es', l: 'ES' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => onLangChange(opt.v)}
                  style={{
                    padding: '7px 16px',
                    background:
                      lang === opt.v ? COLORS.azulNoturno : 'white',
                    color: lang === opt.v ? 'white' : COLORS.azulNoturno,
                    border: `1px solid ${
                      lang === opt.v ? COLORS.azulNoturno : COLORS.border
                    }`,
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: FONT_STACK,
                    letterSpacing: 0.8,
                    minHeight: 34,
                    minWidth: 44,
                  }}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </PreviewRow>
        </div>
      )}
    </div>
  );
}

function PreviewRow({ label, children, last }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        padding: '12px 0',
        borderBottom: last ? 'none' : `1px solid ${COLORS.border}`,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: COLORS.textMuted,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          minWidth: 50,
          paddingTop: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          lineHeight: 1.4,
        }}
      >
        {children}
      </div>
    </div>
  );
}
