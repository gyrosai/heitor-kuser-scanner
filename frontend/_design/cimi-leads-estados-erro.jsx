import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  WifiOff,
  Wifi,
  RefreshCw,
  Camera,
  X,
  AlertTriangle,
  AlertCircle,
  Mail,
  Lock,
  Settings,
  Clock,
  CloudOff,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

// =========================================
// DESIGN TOKENS
// =========================================
const COLORS = {
  laranja360: '#FA6800',
  laranjaAmbar: '#FD9E02',
  azulAtlantico: '#34A9AD',
  azulNoturno: '#002F3F',
  gyrosRoxo: '#7E22CE',
  pageBg: '#EFEFF2',
  appBg: '#F4F4F6',
  surface: '#FFFFFF',
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
  dangerBg: '#FDECEC',
  dangerBorder: '#F5C2C2',
};

const FONT_STACK = '"Montserrat", system-ui, -apple-system, sans-serif';

// =========================================
// MAIN
// =========================================
export default function App() {
  const [state, setState] = useState('offline');

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

  const STATES = [
    { v: 'offline', l: 'Sem net' },
    { v: 'oauth', l: 'OAuth' },
    { v: 'quota', l: 'Quota' },
    { v: 'camera', l: 'Câmera' },
    { v: 'ocr', l: 'OCR' },
    { v: 'sending', l: 'Envio' },
  ];

  return (
    <div
      style={{
        fontFamily: FONT_STACK,
        background: COLORS.pageBg,
        minHeight: '100vh',
        padding: '20px 12px 40px',
      }}
    >
      {/* SWITCHER — 6 estados em 2 linhas */}
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
            Estado de erro · troque pra ver
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
            }}
          >
            {STATES.map((opt) => (
              <button
                key={opt.v}
                onClick={() => setState(opt.v)}
                style={{
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
            borderRadius: 36,
            overflow: 'hidden',
            height: 760,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            background:
              state === 'oauth' || state === 'camera'
                ? COLORS.azulNoturno
                : COLORS.appBg,
          }}
        >
          {state === 'offline' && <OfflineState />}
          {state === 'oauth' && <OAuthExpired />}
          {state === 'quota' && <QuotaExhausted />}
          {state === 'camera' && <CameraDenied />}
          {state === 'ocr' && <OcrFailed />}
          {state === 'sending' && <SendingOffline />}
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
          lineHeight: 1.55,
          padding: '0 12px',
        }}
      >
        <Caption state={state} />
      </div>
    </div>
  );
}

function Caption({ state }) {
  const map = {
    offline:
      'Banner sticky no topo da Home · app continua funcional offline · capturas vão pra fila local',
    oauth:
      'Tela fullscreen Azul Noturno · capturas locais preservadas · sem perder trabalho',
    quota:
      'Banner inline na seção Mídia Kit · checkbox desabilitado · contato pode ser salvo',
    camera:
      'Tela fullscreen com passos pra reativar · saída alternativa via cadastro manual',
    ocr:
      'Banner vermelho no topo da tela Revisar · campos vazios · CTA pra refotografar',
    sending:
      'Badge especial no card Mídia Kit · retry automático ao reconectar · ação manual disponível',
  };
  return map[state];
}

// =========================================
// HEADER + STATUS BAR REUSÁVEIS
// =========================================
function StatusBar({ dark = false }) {
  return (
    <div
      style={{
        background: dark ? 'transparent' : COLORS.azulNoturno,
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
  );
}

function AppHeader({ title, back = true, subtitle }) {
  return (
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
      {back && (
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
      )}
      <div style={{ flex: 1, textAlign: 'center', paddingRight: back ? 44 : 0 }}>
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
          {title}
        </h1>
        {subtitle && (
          <div
            style={{
              fontSize: 11,
              color: COLORS.textMuted,
              fontWeight: 600,
              marginTop: 1,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </header>
  );
}

// =========================================
// 1. SEM INTERNET — banner sticky na Home
// =========================================
function OfflineState() {
  return (
    <>
      <StatusBar />

      {/* Banner sticky offline */}
      <div
        style={{
          background: COLORS.warningBg,
          borderBottom: `1px solid ${COLORS.warningBorder}`,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'white',
            border: `1px solid ${COLORS.warningBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <WifiOff size={15} strokeWidth={2.2} color={COLORS.warning} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: COLORS.warning,
              lineHeight: 1.3,
            }}
          >
            Sem conexão
          </div>
          <div
            style={{
              fontSize: 11,
              color: COLORS.text,
              marginTop: 1,
              lineHeight: 1.4,
            }}
          >
            3 capturas em fila local · serão sincronizadas quando voltar
          </div>
        </div>
        <button
          style={{
            background: 'white',
            border: `1px solid ${COLORS.warningBorder}`,
            color: COLORS.warning,
            borderRadius: 8,
            padding: '7px 12px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: FONT_STACK,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            minHeight: 34,
            flexShrink: 0,
          }}
        >
          <RefreshCw size={11} strokeWidth={2.4} />
          Tentar
        </button>
      </div>

      <AppHeader title="CIMI Leads" back={false} />

      {/* Conteúdo simplificado da Home */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <SectionLabel>Escaneie um contato</SectionLabel>
        <MiniCard
          color={COLORS.laranja360}
          icon={Camera}
          title="Cartão de Visita"
          subtitle="Funciona offline"
        />
        <div style={{ height: 10 }} />
        <MiniCard
          color={COLORS.borderStrong}
          icon={Camera}
          title="QR Code"
          subtitle="Funciona offline"
          muted
        />

        <div style={{ height: 24 }} />

        <SectionLabel>Contatos · 284</SectionLabel>
        <div
          style={{
            background: 'white',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 14,
            fontSize: 12,
            color: COLORS.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CloudOff size={14} strokeWidth={2} />
          Lista local · sync pausada até reconectar
        </div>
      </div>
    </>
  );
}

// =========================================
// 2. OAUTH EXPIRADO — tela fullscreen
// =========================================
function OAuthExpired() {
  return (
    <>
      <StatusBar dark />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 28px',
          color: 'white',
          position: 'relative',
        }}
      >
        {/* Accent geométrico discreto */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: -30,
            width: 100,
            height: 3,
            background: COLORS.laranja360,
            transform: 'rotate(-45deg)',
            opacity: 0.4,
          }}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Ícone */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(250,104,0,0.18)',
              border: `1px solid rgba(250,104,0,0.4)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: COLORS.laranja360,
              marginBottom: 28,
            }}
          >
            <Lock size={26} strokeWidth={1.8} />
          </div>

          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: COLORS.laranja360,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            SESSÃO EXPIRADA.
          </div>

          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: 'white',
              margin: 0,
              letterSpacing: -0.8,
              lineHeight: 1.15,
              marginBottom: 14,
            }}
          >
            Reconecte sua conta Google
          </h1>

          <p
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.55,
              margin: 0,
              marginBottom: 24,
            }}
          >
            Por segurança, sua autenticação foi encerrada. Faça login novamente
            para continuar capturando e enviando o Mídia Kit.
          </p>

          {/* Reassurance */}
          <div
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 32,
            }}
          >
            <Check
              size={16}
              strokeWidth={2.4}
              color={COLORS.laranja360}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'white',
                  marginBottom: 2,
                }}
              >
                Suas capturas estão salvas
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.65)',
                  lineHeight: 1.5,
                }}
              >
                3 cartões aguardam processamento. Nada será perdido com o
                novo login.
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          style={{
            background: 'white',
            color: COLORS.azulNoturno,
            border: 'none',
            borderRadius: 12,
            padding: '15px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: FONT_STACK,
            minHeight: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <GoogleG />
          Conectar com Google
        </button>
      </div>
    </>
  );
}

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
// 3. QUOTA GMAIL ESGOTADA — banner inline na seção Mídia Kit
// =========================================
function QuotaExhausted() {
  return (
    <>
      <StatusBar />
      <AppHeader title="Revisar contato" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px' }}>
        {/* Captura preview compacta */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 120,
              aspectRatio: '16 / 10',
              borderRadius: 12,
              background:
                'linear-gradient(135deg, #1E3A6B 0%, #0F2240 100%)',
              flexShrink: 0,
            }}
          />
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: COLORS.success,
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Check size={11} strokeWidth={3} />
              Cartão capturado
            </div>
            <div
              style={{
                fontSize: 12,
                color: COLORS.textMuted,
                lineHeight: 1.4,
              }}
            >
              5 campos extraídos
              <br />
              João Pereira da Silva
            </div>
          </div>
        </div>

        {/* SEÇÃO MÍDIA KIT COM BANNER DE QUOTA */}
        <SectionLabel>Mídia Kit por e-mail</SectionLabel>

        {/* Banner quota */}
        <div
          style={{
            background: COLORS.warningBg,
            border: `1px solid ${COLORS.warningBorder}`,
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <AlertTriangle
              size={18}
              strokeWidth={2.2}
              color={COLORS.warning}
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: COLORS.warning,
                  marginBottom: 4,
                }}
              >
                Quota diária do Gmail esgotada
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.text,
                  lineHeight: 1.5,
                }}
              >
                2000 de 2000 e-mails enviados hoje. O contato pode ser salvo
                normalmente — o envio do Mídia Kit reabre amanhã às 00:00.
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  marginTop: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  color: COLORS.textMuted,
                }}
              >
                <Clock size={11} strokeWidth={2.4} />
                <span>Reabre em 6h 13min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Checkbox desabilitado */}
        <div
          style={{
            background: 'white',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 14,
            opacity: 0.55,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: COLORS.appBg,
              border: `1.5px solid ${COLORS.borderStrong}`,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: COLORS.textMuted,
                marginBottom: 2,
                textDecoration: 'line-through',
              }}
            >
              Enviar Mídia Kit ao salvar
            </div>
            <div style={{ fontSize: 11, color: COLORS.textSubtle }}>
              Indisponível até as 00:00
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action — cópia muda */}
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
            padding: '15px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: FONT_STACK,
            minHeight: 50,
            letterSpacing: -0.1,
          }}
        >
          Salvar contato sem enviar
        </button>
      </div>
    </>
  );
}

// =========================================
// 4. CÂMERA NEGADA — tela fullscreen com passos
// =========================================
function CameraDenied() {
  return (
    <>
      <StatusBar dark />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          color: 'white',
          padding: '20px 24px 28px',
          position: 'relative',
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <button
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Fechar"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'rgba(185,28,28,0.18)',
            border: '1px solid rgba(185,28,28,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F87171',
            marginBottom: 24,
            position: 'relative',
          }}
        >
          <Camera size={26} strokeWidth={1.8} />
          <div
            style={{
              position: 'absolute',
              right: -4,
              bottom: -4,
              width: 22,
              height: 22,
              borderRadius: 999,
              background: '#B91C1C',
              border: `2px solid ${COLORS.azulNoturno}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={11} strokeWidth={3} color="white" />
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#F87171',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          ACESSO À CÂMERA BLOQUEADO.
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'white',
            margin: 0,
            letterSpacing: -0.6,
            lineHeight: 1.2,
            marginBottom: 14,
          }}
        >
          Ative a câmera no navegador
        </h1>

        <p
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.55,
            margin: 0,
            marginBottom: 22,
          }}
        >
          O CIMI Leads precisa da câmera para capturar cartões. A permissão foi
          negada antes — siga os passos:
        </p>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <Step n={1} text="Toque no cadeado ao lado da URL no topo do navegador" />
          <Step n={2} text="Vá em Permissões e ative Câmera" />
          <Step n={3} text="Recarregue o app" />
        </div>

        <div style={{ flex: 1 }} />

        {/* CTAs */}
        <button
          style={{
            background: 'white',
            color: COLORS.azulNoturno,
            border: 'none',
            borderRadius: 12,
            padding: '14px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: FONT_STACK,
            minHeight: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <RefreshCw size={15} strokeWidth={2.2} />
          Recarregar app
        </button>
        <button
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 12,
            padding: '12px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: FONT_STACK,
            minHeight: 44,
          }}
        >
          Cadastrar contato manualmente
        </button>
      </div>
    </>
  );
}

function Step({ n, text }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 999,
          background: 'rgba(250,104,0,0.2)',
          color: COLORS.laranja360,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 800,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {n}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.5,
          flex: 1,
        }}
      >
        {text}
      </div>
    </div>
  );
}

// =========================================
// 5. OCR FALHOU — banner vermelho na tela Revisar
// =========================================
function OcrFailed() {
  return (
    <>
      <StatusBar />
      <AppHeader title="Revisar contato" />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Capture preview com badge erro */}
        <div style={{ padding: '16px 20px 8px' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div
              style={{
                position: 'relative',
                width: 120,
                aspectRatio: '16 / 10',
                borderRadius: 12,
                background:
                  'linear-gradient(135deg, #2A2A30 0%, #1A1A1E 100%)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: 0.5,
                  fontWeight: 600,
                }}
              >
                FOTO BORRADA
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: COLORS.danger,
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <AlertCircle size={11} strokeWidth={2.4} />
                Leitura falhou
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  lineHeight: 1.4,
                }}
              >
                Nenhum dado extraído da imagem.
              </div>
            </div>
          </div>
        </div>

        {/* Banner OCR erro */}
        <div style={{ padding: '4px 20px 0' }}>
          <div
            style={{
              background: COLORS.dangerBg,
              border: `1px solid ${COLORS.dangerBorder}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <AlertCircle
                size={18}
                strokeWidth={2.2}
                color={COLORS.danger}
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: COLORS.danger,
                    marginBottom: 4,
                  }}
                >
                  Não conseguimos ler o cartão
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: COLORS.text,
                    lineHeight: 1.5,
                  }}
                >
                  A foto pode estar borrada, com pouca luz ou em ângulo difícil.
                  Refaça a captura — geralmente resolve.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, paddingLeft: 28 }}>
              <button
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  background: COLORS.danger,
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: FONT_STACK,
                  minHeight: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <Camera size={13} strokeWidth={2.2} />
                Tirar outra foto
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  background: 'white',
                  color: COLORS.danger,
                  border: `1px solid ${COLORS.dangerBorder}`,
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: FONT_STACK,
                  minHeight: 36,
                }}
              >
                Preencher manual
              </button>
            </div>
          </div>
        </div>

        {/* Form com campos vazios pra preenchimento manual */}
        <div style={{ padding: '20px 20px 16px' }}>
          <SectionLabel>Preencher manualmente</SectionLabel>
          <EmptyField label="Nome" required />
          <EmptyField label="E-mail" />
          <EmptyField label="Telefone" />
          <EmptyField label="Empresa" />
        </div>
      </div>
    </>
  );
}

function EmptyField({ label, required }) {
  return (
    <div style={{ marginBottom: 12 }}>
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
      <input
        placeholder={`Digite ${label.toLowerCase()}`}
        style={{
          width: '100%',
          padding: '13px 14px',
          background: 'white',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          fontSize: 14,
          fontFamily: FONT_STACK,
          color: COLORS.text,
          outline: 'none',
          boxSizing: 'border-box',
          minHeight: 48,
        }}
      />
    </div>
  );
}

// =========================================
// 6. ENVIO OFFLINE — badge no card Mídia Kit
// =========================================
function SendingOffline() {
  return (
    <>
      <StatusBar />

      {/* Banner sutil de offline */}
      <div
        style={{
          background: COLORS.warningBg,
          borderBottom: `1px solid ${COLORS.warningBorder}`,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <WifiOff size={13} strokeWidth={2.4} color={COLORS.warning} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: COLORS.warning,
            letterSpacing: 0.2,
          }}
        >
          Sem conexão · ações ficam em fila
        </span>
      </div>

      <AppHeader title="Editar contato" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
        <SectionLabel>Mídia Kit por e-mail</SectionLabel>

        {/* Card especial: envio aguardando conexão */}
        <div
          style={{
            background: '#FEFCE8',
            border: `1px solid #FDE68A`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: 'white',
                border: '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              <Mail size={16} strokeWidth={2.2} color="#A16207" />
              <div
                style={{
                  position: 'absolute',
                  right: -3,
                  bottom: -3,
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: '#FBBF24',
                  border: '2px solid white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={8} strokeWidth={3} color="white" />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#A16207',
                  marginBottom: 4,
                }}
              >
                Envio aguardando conexão
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: COLORS.text,
                  lineHeight: 1.5,
                  marginBottom: 4,
                }}
              >
                Tentado às 14:32 · Para joao@mendesimoveis.com.br
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  lineHeight: 1.5,
                }}
              >
                Vai tentar de novo automaticamente quando o Wi-Fi voltar.
              </div>
              <button
                style={{
                  marginTop: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  background: 'white',
                  border: '1px solid #FDE68A',
                  borderRadius: 8,
                  color: '#A16207',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: FONT_STACK,
                  minHeight: 36,
                }}
              >
                <RefreshCw size={12} strokeWidth={2.4} />
                Tentar agora
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            color: COLORS.textSubtle,
            lineHeight: 1.5,
            padding: '8px 4px 0',
          }}
        >
          3 envios pendentes no total · todos serão processados quando voltar
          online.
        </div>
      </div>
    </>
  );
}

// =========================================
// HELPERS
// =========================================
function SectionLabel({ children }) {
  return (
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
      {children}
    </div>
  );
}

function MiniCard({ icon: Icon, title, subtitle, color, muted }) {
  return (
    <div
      style={{
        background: muted ? COLORS.surface : 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: muted ? 0.6 : 1,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          flexShrink: 0,
        }}
      >
        <Icon size={18} strokeWidth={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: COLORS.azulNoturno,
            letterSpacing: -0.1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: COLORS.textMuted,
            marginTop: 1,
          }}
        >
          {subtitle}
        </div>
      </div>
      <ChevronRight
        size={16}
        strokeWidth={2}
        color={COLORS.borderStrong}
      />
    </div>
  );
}
