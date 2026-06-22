import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Users,
  User,
  Shield,
  Loader,
} from 'lucide-react';

// =========================================
// DESIGN TOKENS (subset)
// =========================================
const COLORS = {
  laranja360: '#FA6800',
  azulNoturno: '#002F3F',
  pageBg: '#EFEFF2',
  appBg: '#F4F4F6',
  surface: '#FFFFFF',
  border: '#E5E5E8',
  text: '#1A1A1A',
  textMuted: '#5C5C66',
  textSubtle: '#9090A0',
};

const FONT_STACK = '"Montserrat", system-ui, -apple-system, sans-serif';

// =========================================
// MAIN
// =========================================
export default function App() {
  const [state, setState] = useState('initial'); // 'initial' | 'connecting'
  const [expanded, setExpanded] = useState(false);

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
            Estado · troque pra ver
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { v: 'initial', l: 'Inicial' },
              { v: 'connecting', l: 'Conectando' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setState(opt.v)}
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
                    state === opt.v ? COLORS.azulNoturno : COLORS.appBg,
                  color: state === opt.v ? 'white' : COLORS.textMuted,
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
            background: COLORS.azulNoturno,
            borderRadius: 36,
            overflow: 'hidden',
            height: 760,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* Accent geométrico sutil — assinatura visual CIMI */}
          <div
            style={{
              position: 'absolute',
              top: 90,
              right: -40,
              width: 100,
              height: 3,
              background: COLORS.laranja360,
              transform: 'rotate(-45deg)',
              opacity: 0.5,
            }}
          />

          {/* STATUS BAR */}
          <div
            style={{
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

          {/* CONTENT */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '32px 24px 20px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* LOGO + WORDMARK */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <CimiLogo />
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 6,
                  marginTop: 18,
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: COLORS.laranja360,
                    letterSpacing: -0.8,
                    lineHeight: 1,
                  }}
                >
                  cimi
                </span>
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: 'white',
                    letterSpacing: 1.2,
                    lineHeight: 1,
                  }}
                >
                  LEADS
                </span>
              </div>
            </div>

            {/* HERO TEXT */}
            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: COLORS.laranja360,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                BOAS-VINDAS.
              </div>
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: 'white',
                  margin: 0,
                  letterSpacing: -0.7,
                  lineHeight: 1.2,
                  marginBottom: 12,
                }}
              >
                Capture contatos profissionais do ecossistema CIMI360
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.65)',
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                Foto de cartão, QR Code, captura em sequência. Sincronizado
                com seu Google Contacts.
              </p>
            </div>

            {/* AUTH CARD */}
            <div
              style={{
                background: 'white',
                borderRadius: 16,
                padding: 18,
                boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
              }}
            >
              {/* Botão Google */}
              <button
                disabled={state === 'connecting'}
                style={{
                  width: '100%',
                  background:
                    state === 'connecting'
                      ? COLORS.appBg
                      : 'white',
                  color:
                    state === 'connecting'
                      ? COLORS.textMuted
                      : COLORS.azulNoturno,
                  border:
                    state === 'connecting'
                      ? `1px solid ${COLORS.border}`
                      : `1px solid ${COLORS.azulNoturno}`,
                  borderRadius: 12,
                  padding: '14px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor:
                    state === 'connecting' ? 'default' : 'pointer',
                  fontFamily: FONT_STACK,
                  minHeight: 52,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  letterSpacing: -0.1,
                  transition: 'all 0.15s',
                }}
              >
                {state === 'connecting' ? (
                  <>
                    <Spinner />
                    Conectando ao Google...
                  </>
                ) : (
                  <>
                    <GoogleG />
                    Continuar com Google
                  </>
                )}
              </button>

              {/* Disclaimer breve */}
              <div
                style={{
                  fontSize: 11,
                  color: COLORS.textMuted,
                  lineHeight: 1.5,
                  marginTop: 12,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                  justifyContent: 'center',
                }}
              >
                <Shield
                  size={12}
                  strokeWidth={2.2}
                  color={COLORS.textSubtle}
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <span>
                  Acesso pode ser revogado a qualquer momento nas configurações
                  da sua conta Google.
                </span>
              </div>

              {/* Expand permissões */}
              <button
                onClick={() => setExpanded(!expanded)}
                disabled={state === 'connecting'}
                style={{
                  width: '100%',
                  marginTop: 14,
                  padding: '10px 12px',
                  background: COLORS.appBg,
                  border: 'none',
                  borderRadius: 10,
                  cursor:
                    state === 'connecting' ? 'default' : 'pointer',
                  fontFamily: FONT_STACK,
                  fontSize: 12,
                  fontWeight: 700,
                  color: COLORS.azulNoturno,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  letterSpacing: 0.2,
                  opacity: state === 'connecting' ? 0.5 : 1,
                }}
              >
                <span>Detalhes das permissões</span>
                {expanded ? (
                  <ChevronUp size={14} strokeWidth={2.4} />
                ) : (
                  <ChevronDown size={14} strokeWidth={2.4} />
                )}
              </button>

              {expanded && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '4px 0',
                  }}
                >
                  <PermissionRow
                    icon={Mail}
                    label="Gmail"
                    desc="Enviar o Mídia Kit em seu nome para os contatos que você capturar."
                    scope="gmail.send"
                  />
                  <PermissionRow
                    icon={Users}
                    label="Google Contacts"
                    desc="Salvar contatos capturados no seu Google Contacts."
                    scope="contacts"
                  />
                  <PermissionRow
                    icon={User}
                    label="Perfil"
                    desc="Identificar você no app — nome e foto."
                    scope="openid profile"
                    last
                  />
                </div>
              )}
            </div>

            <div style={{ flex: 1, minHeight: 20 }} />

            {/* FOOTER GYROS */}
            <div style={{ textAlign: 'center', paddingTop: 16 }}>
              <div
                style={{
                  width: 28,
                  height: 1,
                  background: 'rgba(255,255,255,0.18)',
                  margin: '0 auto 12px',
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.45)',
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Desenvolvido por
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.75)',
                  letterSpacing: 0.5,
                }}
              >
                Gyros AI Solutions
              </div>
            </div>
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
          lineHeight: 1.55,
          padding: '0 12px',
        }}
      >
        Login OAuth · fundo Azul Noturno institucional · permissões expansíveis
        com escopos técnicos visíveis · estado "Conectando" indica que aba do
        Google será aberta
      </div>
    </div>
  );
}

// =========================================
// LOGO CIMI360 (simulada — substituir por SVG oficial)
// =========================================
function CimiLogo() {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        padding: '12px 4px 0',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '21%',
          width: 14,
          height: 14,
          borderRadius: 999,
          background: COLORS.laranja360,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '58%',
          width: 14,
          height: 14,
          borderRadius: 999,
          background: COLORS.laranja360,
        }}
      />
      <div
        style={{
          fontSize: 50,
          fontWeight: 800,
          color: COLORS.laranja360,
          letterSpacing: -2.5,
          lineHeight: 1,
          fontFamily: FONT_STACK,
        }}
      >
        cimi360
      </div>
    </div>
  );
}

// =========================================
// PERMISSION ROW
// =========================================
function PermissionRow({ icon: Icon, label, desc, scope, last }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 0',
        borderBottom: last ? 'none' : `1px solid ${COLORS.border}`,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: COLORS.appBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.azulNoturno,
          flexShrink: 0,
        }}
      >
        <Icon size={15} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: COLORS.azulNoturno,
              letterSpacing: -0.1,
            }}
          >
            {label}
          </span>
          <code
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: COLORS.textSubtle,
              background: COLORS.appBg,
              padding: '2px 6px',
              borderRadius: 4,
              fontFamily:
                'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
              letterSpacing: 0,
            }}
          >
            {scope}
          </code>
        </div>
        <div
          style={{
            fontSize: 12,
            color: COLORS.textMuted,
            lineHeight: 1.5,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

// =========================================
// GOOGLE G
// =========================================
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.79 2.73v2.27h2.9c1.7-1.56 2.69-3.87 2.69-6.64z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.27c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.71c-.18-.54-.28-1.12-.28-1.71s.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.96 8.96 0 0 0 9 0 9 9 0 0 0 .96 4.96L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

// =========================================
// SPINNER
// =========================================
function Spinner() {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: 999,
        border: `2px solid ${COLORS.textMuted}40`,
        borderTopColor: COLORS.textMuted,
        animation: 'spin 0.8s linear infinite',
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
