import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Check,
  ChevronRight,
  Mic,
  Star,
  Camera,
  Loader,
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
  warning: '#92400E',
  warningBg: '#FEF3E0',
  warningBorder: '#FBD9A5',
  danger: '#B91C1C',
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
  const [demoState, setDemoState] = useState('review');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailLang, setEmailLang] = useState('pt');
  const [interest, setInterest] = useState('Parceria');
  const [importance, setImportance] = useState(2);
  const [invest, setInvest] = useState({ active: true, sub: 'parceria' });
  const [cimi360, setCimi360] = useState({ active: false, sub: 'stand' });

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Fraunces:wght@400;500;600&display=swap';
    document.head.appendChild(link);
    return () => {
      try { document.head.removeChild(link); } catch (e) {}
    };
  }, []);

  const isProcessing = demoState === 'processing';

  return (
    <div
      style={{
        fontFamily: FONT_STACK,
        background: COLORS.pageBg,
        minHeight: '100vh',
        padding: '20px 12px 40px',
      }}
    >
      {/* DEMO SWITCHER */}
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
              { v: 'processing', l: 'Processando' },
              { v: 'review', l: 'Revisar' },
              { v: 'duplicate', l: 'Duplicata' },
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
              Revisar contato
            </h1>
          </header>

          {/* CONTENT */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* CAPTURE PREVIEW */}
            <CapturePreview state={demoState} />

            {/* DUPLICATE BANNER */}
            {demoState === 'duplicate' && <DuplicateBanner />}

            {/* OCR meta line */}
            {!isProcessing && (
              <div
                style={{
                  padding: '4px 20px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.textMuted,
                }}
              >
                <Sparkles size={12} strokeWidth={2.2} color={COLORS.laranja360} />
                <span>
                  5 campos extraídos · revise antes de salvar
                </span>
              </div>
            )}

            <Section title="Dados do contato">
              <Field
                label="Nome"
                value="João Pereira da Silva"
                required
                loading={isProcessing}
              />
              <Field
                label="E-mail"
                value="joao@mendesimoveis.com.br"
                loading={isProcessing}
              />
              <Field
                label="Telefone"
                value="+55 21 95-9497461"
                loading={isProcessing}
                warning={
                  demoState === 'review'
                    ? 'Numeração incomum — verifique'
                    : null
                }
              />
              <Field
                label="Empresa"
                value="Mendes Imóveis"
                loading={isProcessing}
              />
              <Field
                label="Cargo"
                value="Diretor Comercial"
                loading={isProcessing}
                warning={
                  demoState === 'review'
                    ? 'OCR com baixa confiança neste campo'
                    : null
                }
              />
            </Section>

            <Divider />

            <Section title="Importância">
              <div style={{ display: 'flex', gap: 12 }}>
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    onClick={() => !isProcessing && setImportance(i + 1)}
                    disabled={isProcessing}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: isProcessing ? 'default' : 'pointer',
                      color:
                        i < importance && !isProcessing
                          ? COLORS.laranja360
                          : COLORS.borderStrong,
                      opacity: isProcessing ? 0.4 : 1,
                    }}
                    aria-label={`Importância ${i + 1}`}
                  >
                    <Star
                      size={34}
                      fill={
                        i < importance && !isProcessing
                          ? COLORS.laranja360
                          : 'none'
                      }
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
                    disabled={isProcessing}
                    onClick={() =>
                      !isProcessing &&
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
                disabled={isProcessing}
                onToggle={() =>
                  !isProcessing &&
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
                disabled={isProcessing}
                onToggle={() =>
                  !isProcessing &&
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

            <Section title="Mídia Kit por e-mail">
              <EmailKit
                enabled={emailEnabled}
                onToggle={() => setEmailEnabled(!emailEnabled)}
                lang={emailLang}
                onLangChange={setEmailLang}
                disabled={isProcessing}
              />
            </Section>

            <Divider />

            <Section title="Observações">
              <button
                disabled={isProcessing}
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
                  cursor: isProcessing ? 'default' : 'pointer',
                  fontFamily: FONT_STACK,
                  opacity: isProcessing ? 0.5 : 1,
                }}
              >
                <Mic size={16} strokeWidth={2} />
                Gravar áudio
              </button>
              <textarea
                placeholder="Notas sobre o contato..."
                rows={3}
                disabled={isProcessing}
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
                  opacity: isProcessing ? 0.5 : 1,
                }}
              />
            </Section>

            <Divider />

            <Section title="Evento">
              <Field value="CIMI360 2026" loading={isProcessing} />
            </Section>

            <div style={{ height: 20 }} />
          </div>

          {/* BOTTOM */}
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
              disabled={isProcessing}
              style={{
                width: '100%',
                background: isProcessing
                  ? COLORS.borderStrong
                  : COLORS.laranja360,
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '15px',
                fontSize: 15,
                fontWeight: 700,
                cursor: isProcessing ? 'default' : 'pointer',
                fontFamily: FONT_STACK,
                letterSpacing: -0.1,
                minHeight: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isProcessing ? (
                <>
                  <Spinner />
                  Extraindo dados...
                </>
              ) : emailEnabled ? (
                'Salvar e enviar Mídia Kit'
              ) : (
                'Salvar contato'
              )}
            </button>
            <button
              disabled={isProcessing}
              style={{
                width: '100%',
                background: 'none',
                color: COLORS.textMuted,
                border: 'none',
                padding: '10px',
                fontSize: 13,
                fontWeight: 600,
                cursor: isProcessing ? 'default' : 'pointer',
                fontFamily: FONT_STACK,
                opacity: isProcessing ? 0.4 : 1,
              }}
            >
              Cancelar
            </button>
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
        Revisão pós-captura · 3 estados · hints de baixa confiança aparecem
        abaixo de campos específicos (telefone, cargo) no estado "Revisar"
      </div>
    </div>
  );
}

// =========================================
// CAPTURE PREVIEW — thumb + ações
// =========================================
function CapturePreview({ state }) {
  const isProcessing = state === 'processing';

  return (
    <div style={{ padding: '16px 20px 4px' }}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 120,
            aspectRatio: '16 / 10',
            borderRadius: 12,
            overflow: 'hidden',
            background:
              'linear-gradient(135deg, #1E3A6B 0%, #0F2240 100%)',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          {/* mock cartão João Pereira */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              padding: 10,
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontSize: 8,
                fontWeight: 700,
                opacity: 0.8,
                letterSpacing: 1,
              }}
            >
              MENDES IMÓVEIS
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700 }}>João Pereira</div>
              <div
                style={{
                  fontSize: 6.5,
                  opacity: 0.7,
                  marginTop: 1,
                }}
              >
                Diretor Comercial
              </div>
            </div>
          </div>

          {isProcessing && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(2px)',
              }}
            >
              <Spinner color="white" size={20} />
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: isProcessing
                  ? COLORS.laranja360
                  : COLORS.success,
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isProcessing ? (
                <>
                  <Spinner size={10} color={COLORS.laranja360} />
                  Processando
                </>
              ) : (
                <>
                  <Check size={12} strokeWidth={3} />
                  Cartão capturado
                </>
              )}
            </div>
            <div
              style={{
                fontSize: 12,
                color: COLORS.textMuted,
                lineHeight: 1.4,
              }}
            >
              {isProcessing
                ? 'Extraindo dados do cartão com OCR...'
                : 'Confira os dados abaixo antes de salvar.'}
            </div>
          </div>

          <button
            disabled={isProcessing}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 10px',
              background: 'none',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              color: COLORS.azulNoturno,
              fontSize: 11,
              fontWeight: 700,
              cursor: isProcessing ? 'default' : 'pointer',
              fontFamily: FONT_STACK,
              marginTop: 8,
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            <Camera size={12} strokeWidth={2} />
            Tirar outra
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================
// DUPLICATE BANNER
// =========================================
function DuplicateBanner() {
  return (
    <div style={{ padding: '12px 20px 0' }}>
      <div
        style={{
          background: COLORS.warningBg,
          border: `1px solid ${COLORS.warningBorder}`,
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
          <AlertTriangle
            size={18}
            strokeWidth={2.2}
            color={COLORS.warning}
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: COLORS.warning,
                marginBottom: 2,
              }}
            >
              Contato parecido encontrado
            </div>
            <div
              style={{
                fontSize: 12,
                color: COLORS.text,
                lineHeight: 1.4,
              }}
            >
              <strong>João Pereira da Silva</strong> · Mendes Imóveis
            </div>
            <div
              style={{
                fontSize: 11,
                color: COLORS.textMuted,
                marginTop: 1,
              }}
            >
              Capturado em 14/jun · evento Pré-CIMI360
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, paddingLeft: 28 }}>
          <button
            style={{
              flex: 1,
              padding: '8px 12px',
              background: COLORS.warning,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: FONT_STACK,
              minHeight: 36,
            }}
          >
            Mesclar dados
          </button>
          <button
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'white',
              color: COLORS.warning,
              border: `1px solid ${COLORS.warningBorder}`,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: FONT_STACK,
              minHeight: 36,
            }}
          >
            Ver existente
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================
// SUB-COMPONENTS (reusáveis com a tela Editar contato)
// =========================================
function Section({ title, children }) {
  return (
    <div style={{ padding: '16px 20px 4px' }}>
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
        margin: '4px 20px',
      }}
    />
  );
}

function Field({ label, value, required, loading, warning }) {
  if (loading) {
    return (
      <div style={{ marginBottom: 12 }}>
        {label && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.textMuted,
              marginBottom: 6,
            }}
          >
            {label}
          </div>
        )}
        <div
          style={{
            width: '100%',
            height: 48,
            background: COLORS.appBg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
              animation: 'shimmer 1.6s ease-in-out infinite',
            }}
          />
          <style>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 12 }}>
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
          border: `1px solid ${warning ? COLORS.warningBorder : COLORS.border}`,
          borderRadius: 10,
          fontSize: 15,
          fontFamily: FONT_STACK,
          fontWeight: 500,
          color: COLORS.text,
          outline: 'none',
          boxSizing: 'border-box',
          minHeight: 48,
          boxShadow: warning ? `0 0 0 3px ${COLORS.warningBg}` : 'none',
        }}
      />
      {warning && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 6,
            fontSize: 11,
            color: COLORS.warning,
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={11} strokeWidth={2.4} />
          <span>{warning}</span>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 14px',
        background: active ? COLORS.azulNoturno : 'white',
        color: active ? 'white' : COLORS.azulNoturno,
        border: `1px solid ${active ? COLORS.azulNoturno : COLORS.border}`,
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: FONT_STACK,
        minHeight: 36,
        letterSpacing: 0.1,
        opacity: disabled ? 0.5 : 1,
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
  disabled,
}) {
  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${active ? color : COLORS.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <button
        onClick={onToggle}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '14px 14px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: disabled ? 'default' : 'pointer',
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
              disabled={disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                background: 'none',
                border: 'none',
                cursor: disabled ? 'default' : 'pointer',
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
              <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>
                {opt}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmailKit({ enabled, onToggle, lang, onLangChange, disabled }) {
  return (
    <div style={{ opacity: disabled ? 0.5 : 1 }}>
      <button
        onClick={onToggle}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '14px',
          background: 'white',
          border: `1px solid ${enabled ? COLORS.laranja360 : COLORS.border}`,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: disabled ? 'default' : 'pointer',
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
              João Pereira da Silva
            </span>
            <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 2 }}>
              joao@mendesimoveis.com.br
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

function Spinner({ size = 14, color = 'white' }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        border: `2px solid ${color}40`,
        borderTopColor: color,
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
