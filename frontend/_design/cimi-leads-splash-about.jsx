import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ExternalLink,
  Mail,
  Shield,
  FileText,
  Github,
} from 'lucide-react';

// =========================================
// DESIGN TOKENS
// =========================================
const COLORS = {
  laranja360: '#FA6800',
  laranjaAmbar: '#FD9E02',
  azulAtlantico: '#34A9AD',
  azulNoturno: '#002F3F',
  // Gyros (apenas na assinatura)
  gyrosRoxo: '#7E22CE',
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
  const [screen, setScreen] = useState('splash');

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Fraunces:wght@400;500;600;700&display=swap';
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
            Tela · troque pra ver
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { v: 'splash', l: 'Splash' },
              { v: 'about', l: 'Sobre' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setScreen(opt.v)}
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
                    screen === opt.v ? COLORS.azulNoturno : COLORS.appBg,
                  color: screen === opt.v ? 'white' : COLORS.textMuted,
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
            borderRadius: 36,
            overflow: 'hidden',
            height: 760,
            position: 'relative',
            background: screen === 'splash' ? COLORS.azulNoturno : COLORS.appBg,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {screen === 'splash' ? <Splash /> : <About />}
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
        {screen === 'splash'
          ? 'Splash · Azul Noturno fullbleed · logo CIMI360 simulado · assinatura Gyros sutil no rodapé'
          : 'Sobre · scrollável · seção "Desenvolvido por" com identidade Gyros (Plus Jakarta Sans, roxo) em escala discreta'}
      </div>
    </div>
  );
}

// =========================================
// SPLASH SCREEN
// =========================================
function Splash() {
  return (
    <div
      style={{
        flex: 1,
        background: COLORS.azulNoturno,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '60px 32px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Sutil accent geométrico — barra laranja diagonal no canto */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -40,
          width: 120,
          height: 4,
          background: COLORS.laranja360,
          transform: 'rotate(-45deg)',
          transformOrigin: 'center',
          opacity: 0.5,
        }}
      />

      <div /> {/* spacer top */}

      {/* CENTER — logo + wordmark */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {/* Logo CIMI360 simulado */}
        <CimiLogo />

        {/* Divider sutil */}
        <div
          style={{
            width: 40,
            height: 1,
            background: 'rgba(255,255,255,0.18)',
          }}
        />

        {/* Wordmark sub-marca */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 28,
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
              fontSize: 24,
              fontWeight: 700,
              color: 'white',
              letterSpacing: 1.5,
              lineHeight: 1,
            }}
          >
            LEADS
          </span>
        </div>

        {/* Loading indicator sutil */}
        <div style={{ marginTop: 12 }}>
          <LoadingBar />
        </div>
      </div>

      {/* BOTTOM — assinatura Gyros */}
      <div style={{ textAlign: 'center' }}>
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
  );
}

// Logo CIMI360 simulada — provisória até receber o SVG oficial
function CimiLogo() {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        padding: '14px 4px 0',
      }}
    >
      {/* Bolinhas em cima dos "i"s (assinatura do logo) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '21%',
          width: 18,
          height: 18,
          borderRadius: 999,
          background: COLORS.laranja360,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '58%',
          width: 18,
          height: 18,
          borderRadius: 999,
          background: COLORS.laranja360,
        }}
      />
      <div
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: COLORS.laranja360,
          letterSpacing: -3,
          lineHeight: 1,
          fontFamily: FONT_STACK,
        }}
      >
        cimi360
      </div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.65)',
          letterSpacing: 1.8,
          textAlign: 'center',
          marginTop: 8,
        }}
      >
        CONGRESSO INTERNACIONAL
        <br />
        DO MERCADO IMOBILIÁRIO
      </div>
    </div>
  );
}

function LoadingBar() {
  return (
    <div
      style={{
        width: 80,
        height: 2,
        background: 'rgba(255,255,255,0.12)',
        borderRadius: 999,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '40%',
          height: '100%',
          background: COLORS.laranja360,
          borderRadius: 999,
          animation: 'loadingSlide 1.4s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes loadingSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}

// =========================================
// ABOUT SCREEN
// =========================================
function About() {
  return (
    <>
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
          Sobre
        </h1>
      </header>

      {/* SCROLLABLE */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '24px 20px 40px',
        }}
      >
        {/* HERO: wordmark + descrição */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: COLORS.laranja360,
                letterSpacing: -1.4,
                lineHeight: 1,
              }}
            >
              cimi
            </span>
            <span
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: COLORS.azulNoturno,
                letterSpacing: 2,
                lineHeight: 1,
              }}
            >
              LEADS
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.textSubtle,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            Versão 1.0.0 · build 20260621.1
          </div>
        </div>

        {/* DESCRIÇÃO INSTITUCIONAL */}
        <div
          style={{
            background: 'white',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: 18,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: COLORS.text,
              fontWeight: 500,
            }}
          >
            Aplicativo de captura de contatos profissionais para o ecossistema{' '}
            <strong style={{ color: COLORS.azulNoturno }}>CIMI360</strong>. Lê
            cartões de visita e QR Codes, sincroniza com Google Contacts e
            envia o Mídia Kit institucional por e-mail.
          </div>
        </div>

        {/* CIMI360 — A MARCA */}
        <SectionTitle>CIMI360</SectionTitle>
        <div
          style={{
            background: 'white',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: 18,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: COLORS.laranja360,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            MOVIMENTO.
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: COLORS.textMuted,
              fontWeight: 500,
            }}
          >
            Congresso Internacional do Mercado Imobiliário. Um espaço
            permanente de construção, onde o mercado se olha com maturidade e
            o Brasil se apresenta ao mundo.
          </div>
        </div>

        {/* DESENVOLVIDO POR GYROS — assinatura discreta com identidade própria */}
        <SectionTitle>Desenvolvido por</SectionTitle>
        <div
          style={{
            background: 'white',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: 18,
            marginBottom: 24,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Accent vertical roxa Gyros — sutil */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: COLORS.gyrosRoxo,
            }}
          />

          <div style={{ paddingLeft: 6 }}>
            <div
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontSize: 24,
                fontWeight: 600,
                color: COLORS.gyrosRoxo,
                letterSpacing: -0.5,
                lineHeight: 1.1,
                marginBottom: 4,
              }}
            >
              Gyros AI Solutions
            </div>
            <div
              style={{
                fontSize: 13,
                color: COLORS.textMuted,
                fontWeight: 500,
                marginBottom: 14,
              }}
            >
              Tecnologia com alma.
            </div>

            <div
              style={{
                fontSize: 12,
                color: COLORS.text,
                lineHeight: 1.55,
                marginBottom: 14,
              }}
            >
              Soluções de IA aplicada para o mercado imobiliário. Agentes,
              automações e inteligência de dados.
            </div>

            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: COLORS.gyrosRoxo,
                textDecoration: 'none',
              }}
            >
              gyrosai.com
              <ExternalLink size={13} strokeWidth={2.2} />
            </a>
          </div>
        </div>

        {/* SUPORTE */}
        <SectionTitle>Suporte</SectionTitle>
        <div
          style={{
            background: 'white',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >
          <LinkRow
            icon={Mail}
            label="Falar com o suporte"
            value="camila@gyrosai.com"
          />
          <LinkRow
            icon={FileText}
            label="Termos de uso"
            divider
            external
          />
          <LinkRow
            icon={Shield}
            label="Política de privacidade"
            external
          />
        </div>

        {/* COPYRIGHT */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: COLORS.textSubtle,
            lineHeight: 1.5,
            marginTop: 8,
          }}
        >
          © 2026 Gyros AI Solutions
          <br />
          CNPJ 54.849.395/0001-20
        </div>
      </div>
    </>
  );
}

function SectionTitle({ children }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: COLORS.azulNoturno,
        marginBottom: 10,
        paddingLeft: 4,
      }}
    >
      {children}
    </div>
  );
}

function LinkRow({ icon: Icon, label, value, divider, external }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: divider ? `1px solid ${COLORS.border}` : 'none',
        cursor: 'pointer',
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
        <Icon size={16} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: COLORS.azulNoturno,
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
        {value && (
          <div
            style={{
              fontSize: 12,
              color: COLORS.textMuted,
              marginTop: 1,
            }}
          >
            {value}
          </div>
        )}
      </div>
      {external && (
        <ExternalLink
          size={14}
          strokeWidth={2}
          color={COLORS.textSubtle}
        />
      )}
    </div>
  );
}
