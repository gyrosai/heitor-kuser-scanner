import React, { useState, useEffect } from 'react';
import {
  X,
  ZapOff,
  Zap,
  RefreshCw,
  ChevronLeft,
  Check,
} from 'lucide-react';

// =========================================
// DESIGN TOKENS
// =========================================
const COLORS = {
  laranja360: '#FA6800',
  azulNoturno: '#002F3F',
  pageBg: '#EFEFF2',
  text: '#1A1A1A',
  textMuted: '#5C5C66',
  textSubtle: '#9090A0',
  border: '#E5E5E8',
};

const FONT_STACK = '"Montserrat", system-ui, -apple-system, sans-serif';

// =========================================
// MAIN
// =========================================
export default function App() {
  const [mode, setMode] = useState('card'); // 'card' | 'qr' | 'burst'
  const [flashOn, setFlashOn] = useState(false);
  const [burstCount, setBurstCount] = useState(5);

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
      {/* MODE SWITCHER (fora do phone) */}
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
            Modo de captura · troque pra ver
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { v: 'card', l: 'Cartão' },
              { v: 'qr', l: 'QR Code' },
              { v: 'burst', l: 'Rajada' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setMode(opt.v)}
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
                    mode === opt.v ? COLORS.azulNoturno : '#F4F4F6',
                  color: mode === opt.v ? 'white' : COLORS.textMuted,
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
            background: '#0E0E10',
            borderRadius: 36,
            overflow: 'hidden',
            height: 760,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* CAMERA FEED SIMULATION (fullbleed) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at center, #2A2A30 0%, #0A0A0E 80%)',
              overflow: 'hidden',
            }}
          >
            {/* sutis "luzes de evento" pra dar ambiente */}
            <div
              style={{
                position: 'absolute',
                top: '20%',
                left: '15%',
                width: 80,
                height: 80,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(250,104,0,0.18) 0%, transparent 70%)',
                filter: 'blur(20px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '25%',
                right: '20%',
                width: 100,
                height: 100,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(52,169,173,0.15) 0%, transparent 70%)',
                filter: 'blur(24px)',
              }}
            />

            {/* Cartão "sob câmera" — só visível no modo card e burst */}
            {(mode === 'card' || mode === 'burst') && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-3deg)',
                  width: 220,
                  height: 138,
                  background:
                    'linear-gradient(135deg, #4A1F75 0%, #2D1352 100%)',
                  borderRadius: 8,
                  boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.85,
                }}
              >
                <span
                  style={{
                    fontFamily: '"Fraunces", Georgia, serif',
                    fontSize: 22,
                    fontWeight: 600,
                    color: 'white',
                    letterSpacing: 3,
                    opacity: 0.92,
                  }}
                >
                  GYROS
                </span>
              </div>
            )}

            {/* QR mock — visível no modo qr */}
            {mode === 'qr' && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 140,
                  height: 140,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: 2,
                  opacity: 0.5,
                }}
              >
                {Array.from({ length: 64 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      background:
                        Math.random() > 0.5
                          ? 'rgba(255,255,255,0.85)'
                          : 'transparent',
                      borderRadius: 1,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* STATUS BAR */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              height: 42,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 28px',
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 100%)',
            }}
          >
            <span>9:41</span>
            <span style={{ fontSize: 11, opacity: 0.9, letterSpacing: 1 }}>
              ●●● 5G ◐
            </span>
          </div>

          {/* HEADER */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              padding: '8px 12px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <button
              aria-label="Fechar"
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(8px)',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} strokeWidth={2.2} />
            </button>

            <div
              style={{
                color: 'white',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: -0.1,
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              {mode === 'card' && 'Cartão de Visita'}
              {mode === 'qr' && 'QR Code'}
              {mode === 'burst' && `Modo Rajada · ${burstCount}`}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setFlashOn(!flashOn)}
                aria-label={flashOn ? 'Desligar flash' : 'Ligar flash'}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  background: flashOn
                    ? COLORS.laranja360
                    : 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(8px)',
                  border: 'none',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {flashOn ? (
                  <Zap size={16} strokeWidth={2.2} fill="white" />
                ) : (
                  <ZapOff size={16} strokeWidth={2.2} />
                )}
              </button>
              <button
                aria-label="Trocar câmera"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(8px)',
                  border: 'none',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={16} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {/* SPACER pra empurrar o frame pro centro */}
          <div style={{ flex: 1, position: 'relative', zIndex: 5 }}>
            {/* FRAME DE ENQUADRAMENTO */}
            {mode === 'card' && <CardFrame />}
            {mode === 'qr' && <QrFrame />}
            {mode === 'burst' && <CardFrame />}
          </div>

          {/* BOTTOM CONTROLS */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              padding: '8px 20px 24px',
              background:
                'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)',
            }}
          >
            {/* Helper text */}
            <div
              style={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.92)',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                lineHeight: 1.4,
              }}
            >
              {mode === 'card' && 'Posicione o cartão dentro do quadro'}
              {mode === 'qr' && 'Aponte para o QR Code'}
              {mode === 'burst' &&
                'Fotografe vários cartões em sequência'}
            </div>
            <div
              style={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 11,
                fontWeight: 500,
                marginBottom: 18,
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              {mode === 'card' && 'Boa iluminação melhora a leitura'}
              {mode === 'qr' && 'A captura é automática'}
              {mode === 'burst' &&
                'O processamento começa quando você concluir'}
            </div>

            {/* THUMBNAIL STRIP — só no modo burst */}
            {mode === 'burst' && (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  marginBottom: 16,
                  overflowX: 'auto',
                  paddingBottom: 4,
                }}
              >
                {Array.from({ length: burstCount }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 42,
                      height: 28,
                      borderRadius: 4,
                      background: `linear-gradient(135deg, rgba(${
                        80 + i * 20
                      }, ${50 + i * 12}, ${120 - i * 8}, 0.8) 0%, rgba(40, 25, 60, 0.9) 100%)`,
                      border: '1px solid rgba(255,255,255,0.18)',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            )}

            {/* CONTROLS ROW */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
                position: 'relative',
              }}
            >
              {/* Burst: botão concluir à esquerda */}
              {mode === 'burst' && (
                <button
                  style={{
                    position: 'absolute',
                    left: 0,
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: 999,
                    color: 'white',
                    padding: '11px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: FONT_STACK,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    letterSpacing: 0.2,
                  }}
                >
                  <Check size={14} strokeWidth={2.5} />
                  Concluir
                </button>
              )}

              {/* SHUTTER — só no card e burst */}
              {(mode === 'card' || mode === 'burst') && (
                <button
                  onClick={() => mode === 'burst' && setBurstCount(burstCount + 1)}
                  aria-label="Capturar"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 999,
                    background: 'transparent',
                    border: '4px solid rgba(255,255,255,0.95)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                  }}
                >
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 999,
                      background: 'white',
                    }}
                  />
                </button>
              )}

              {/* SCANNING INDICATOR — só no QR */}
              {mode === 'qr' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 999,
                    padding: '12px 22px',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: FONT_STACK,
                    letterSpacing: 0.2,
                  }}
                >
                  <Pulse />
                  Buscando código...
                </div>
              )}
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
          lineHeight: 1.5,
          padding: '0 12px',
        }}
      >
        Telas de captura · fullbleed câmera · header e bottom flutuantes ·
        botão shutter convencional (72px) · QR sem botão (captura automática)
      </div>
    </div>
  );
}

// =========================================
// CARD FRAME — proporção cartão de visita (1.55:1)
// =========================================
function CardFrame() {
  const bracketColor = COLORS.laranja360;
  const bracketSize = 26;
  const bracketWeight = 4;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 280,
        height: 180,
        pointerEvents: 'none',
      }}
    >
      {/* Top-left bracket */}
      <Bracket
        position="top-left"
        size={bracketSize}
        weight={bracketWeight}
        color={bracketColor}
      />
      <Bracket
        position="top-right"
        size={bracketSize}
        weight={bracketWeight}
        color={bracketColor}
      />
      <Bracket
        position="bottom-left"
        size={bracketSize}
        weight={bracketWeight}
        color={bracketColor}
      />
      <Bracket
        position="bottom-right"
        size={bracketSize}
        weight={bracketWeight}
        color={bracketColor}
      />
    </div>
  );
}

// =========================================
// QR FRAME — quadrado com animação de scanning
// =========================================
function QrFrame() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 220,
        height: 220,
        pointerEvents: 'none',
      }}
    >
      <Bracket
        position="top-left"
        size={32}
        weight={4}
        color={COLORS.laranja360}
      />
      <Bracket
        position="top-right"
        size={32}
        weight={4}
        color={COLORS.laranja360}
      />
      <Bracket
        position="bottom-left"
        size={32}
        weight={4}
        color={COLORS.laranja360}
      />
      <Bracket
        position="bottom-right"
        size={32}
        weight={4}
        color={COLORS.laranja360}
      />

      {/* Scan line animada */}
      <div
        style={{
          position: 'absolute',
          left: 8,
          right: 8,
          height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${COLORS.laranja360} 50%, transparent 100%)`,
          boxShadow: `0 0 8px ${COLORS.laranja360}`,
          animation: 'scanLine 2s ease-in-out infinite',
          top: '50%',
        }}
      />
      <style>{`
        @keyframes scanLine {
          0%, 100% { transform: translateY(-90px); opacity: 0.4; }
          50% { transform: translateY(90px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// =========================================
// BRACKET — canto em L
// =========================================
function Bracket({ position, size, weight, color }) {
  const styles = {
    'top-left': {
      top: 0,
      left: 0,
      borderTop: `${weight}px solid ${color}`,
      borderLeft: `${weight}px solid ${color}`,
      borderTopLeftRadius: 4,
    },
    'top-right': {
      top: 0,
      right: 0,
      borderTop: `${weight}px solid ${color}`,
      borderRight: `${weight}px solid ${color}`,
      borderTopRightRadius: 4,
    },
    'bottom-left': {
      bottom: 0,
      left: 0,
      borderBottom: `${weight}px solid ${color}`,
      borderLeft: `${weight}px solid ${color}`,
      borderBottomLeftRadius: 4,
    },
    'bottom-right': {
      bottom: 0,
      right: 0,
      borderBottom: `${weight}px solid ${color}`,
      borderRight: `${weight}px solid ${color}`,
      borderBottomRightRadius: 4,
    },
  }[position];

  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        ...styles,
      }}
    />
  );
}

// =========================================
// PULSE — indicador animado de scanning
// =========================================
function Pulse() {
  return (
    <div
      style={{
        position: 'relative',
        width: 10,
        height: 10,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 999,
          background: COLORS.laranja360,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: -3,
          borderRadius: 999,
          border: `1.5px solid ${COLORS.laranja360}`,
          animation: 'pulseRing 1.4s ease-out infinite',
        }}
      />
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
