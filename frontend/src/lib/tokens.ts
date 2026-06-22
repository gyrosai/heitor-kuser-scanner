/**
 * CIMI Leads — Design Tokens
 * ============================
 *
 * Single source of truth do design system.
 *
 * Derivado de:
 *   - Brand Guide CIMI360 (cores, tipografia Montserrat)
 *   - Gyros Aura Design System (Fraunces apenas em "Powered by")
 *   - Decisões de UX consolidadas durante o redesign
 *
 * COMO USAR:
 *
 *   import { colors, spacing, radius, fonts } from '@/lib/tokens';
 *
 *   <div style={{
 *     background: colors.brand.laranja360,
 *     padding: spacing[4],
 *     borderRadius: radius.xl,
 *     fontFamily: fonts.sans,
 *   }}>
 *
 * Para Tailwind 4, ver a seção @theme no final do arquivo —
 * cole em globals.css.
 */

// =========================================
// COLORS
// =========================================
export const colors = {
  /** Cores oficiais do brand CIMI360 (slide 10 do guia de marca) */
  brand: {
    /** Laranja 360 — primária, CTAs, accents, badges ativas */
    laranja360: "#FA6800",
    /** Laranja Âmbar — accent secundário, warning */
    laranjaAmbar: "#FD9E02",
    /** Azul Atlântico — secundária, badges CIMI Invest */
    azulAtlantico: "#34A9AD",
    /** Azul Noturno — texto institucional, status bar, fundos sóbrios */
    azulNoturno: "#002F3F",
  },

  /** Marca Gyros — usar APENAS na seção "Powered by" / Sobre */
  gyros: {
    /** Roxo Gyros 700 — assinatura institucional */
    roxo: "#7E22CE",
  },

  /** Escala neutra com undertone sutil */
  neutral: {
    white: "#FFFFFF",
    /** Background da página inteira (fora do app) */
    pageBg: "#EFEFF2",
    /** Background interno do app */
    appBg: "#F4F4F6",
    /** Cards, inputs */
    surface: "#FFFFFF",
    /** Cards secundários (modo Rajada terciário) */
    surfaceMuted: "#F8F8FA",
    /** Bordas padrão */
    border: "#E5E5E8",
    /** Bordas de elementos interativos (estado default) */
    borderStrong: "#C9C9D0",
  },

  /** Tipografia */
  text: {
    /** Texto corpo principal */
    default: "#1A1A1A",
    /** Texto secundário, descrições */
    muted: "#5C5C66",
    /** Texto terciário, timestamps, captions */
    subtle: "#9090A0",
    /** Texto sobre fundos escuros */
    inverse: "#FFFFFF",
  },

  /**
   * Estados semânticos.
   * Sempre usar o trio fg/bg/border de uma mesma cor pra coerência.
   */
  semantic: {
    success: {
      fg: "#1B7F47",
      bg: "#E8F5EC",
      border: "#BBE2C8",
    },
    warning: {
      fg: "#92400E",
      bg: "#FEF3E0",
      border: "#FBD9A5",
    },
    danger: {
      fg: "#B91C1C",
      bg: "#FDECEC",
      border: "#F5C2C2",
    },
    info: {
      fg: "#1E40AF",
      bg: "#EFF6FF",
      border: "#BFDBFE",
    },
  },

  /**
   * Tinted backgrounds para chips/badges.
   * Usado pra classification chips (Invest azul, 360 laranja).
   */
  tint: {
    laranja: {
      bg: "#FFF0E5",
      border: "#FFD4B5",
    },
    atlantico: {
      bg: "#E8F5F6",
      border: "#B7DEE0",
    },
  },
} as const;

// =========================================
// FONTS
// =========================================
export const fonts = {
  /** Fonte principal de todo o app (brand CIMI360) */
  sans: '"Montserrat", system-ui, -apple-system, sans-serif',
  /** APENAS para a assinatura Gyros na tela Sobre */
  display: '"Fraunces", Georgia, serif',
} as const;

// =========================================
// FONT SIZES
// =========================================
export const fontSize = {
  /** Section labels uppercase, footer disclaimers */
  xxs: 10,
  /** Captions, timestamps */
  xs: 11,
  /** Helper text, badges, chips */
  sm: 12,
  /** Body padrão, status badges */
  base: 13,
  /** Card titles, button text */
  md: 14,
  /** Input values, list item titles */
  lg: 15,
  /** Page titles (header) */
  xl: 16,
  /** Section heroes */
  "2xl": 22,
  /** Wordmark CIMI LEADS */
  "3xl": 26,
  /** OAuth title, large headlines */
  "4xl": 32,
  /** Splash logo */
  "5xl": 64,
} as const;

// =========================================
// FONT WEIGHTS
// =========================================
export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  /** Padrão para titles, labels, chips */
  bold: 700,
  /** Hero titles, wordmark, números grandes */
  extrabold: 800,
} as const;

// =========================================
// LINE HEIGHTS
// =========================================
export const lineHeight = {
  none: 1,
  tight: 1.15,
  snug: 1.3,
  base: 1.5,
  relaxed: 1.6,
} as const;

// =========================================
// LETTER SPACING
// =========================================
export const letterSpacing = {
  /** Titles grandes, wordmark */
  tighter: -0.6,
  tight: -0.2,
  normal: 0,
  /** Section labels uppercase */
  wide: 1.2,
  /** Pillar labels (padrão CIMI) */
  wider: 1.4,
  widest: 1.8,
} as const;

// =========================================
// SPACING — base 4px
// =========================================
export const spacing = {
  0: 0,
  /** 4px — gaps mínimos, padding interno tight */
  1: 4,
  /** 8px — gaps entre itens próximos */
  2: 8,
  /** 12px — padding interno padrão de chips */
  3: 12,
  /** 16px — padding interno de cards, gap entre seções próximas */
  4: 16,
  /** 20px — padding lateral padrão (sections) */
  5: 20,
  /** 24px — gap entre seções */
  6: 24,
  /** 32px — gap entre grupos de seções */
  8: 32,
  /** 40px — padding tela vazia */
  10: 40,
  /** 48px — espaçamento generoso */
  12: 48,
  /** 64px — heroes */
  16: 64,
} as const;

// =========================================
// BORDER RADIUS
// =========================================
export const radius = {
  none: 0,
  /** 4px — bordas internas sutis */
  xs: 4,
  /** 6px — chips, badges pequenos */
  sm: 6,
  /** 8px — botões secundários, segmented tabs */
  md: 8,
  /** 10px — inputs, cards de classificação interna */
  lg: 10,
  /** 12px — botões primários, cards principais */
  xl: 12,
  /** 14px — capture cards, alerts */
  "2xl": 14,
  /** 16px — empty state icons */
  "3xl": 16,
  /** 24px — large hero cards (pouco usado) */
  "4xl": 24,
  /** 9999px — pills, avatares, ícones circulares */
  full: 9999,
} as const;

// =========================================
// SHADOWS
// =========================================
export const shadow = {
  none: "none",
  /** Sombra mínima — cards de lista */
  sm: "0 1px 3px rgba(0,0,0,0.08)",
  /** Sombra padrão — cards elevados */
  md: "0 4px 12px rgba(0,0,0,0.06)",
  /** Sombra forte — sheets, modais */
  lg: "0 8px 24px rgba(0,0,0,0.1)",
  /** Sombra hero — capture preview */
  xl: "0 12px 30px rgba(0,0,0,0.18)",
  /** CTA primário Laranja 360 */
  primary: "0 6px 16px rgba(250,104,0,0.22)",
  /** Capture card primário (mais forte) */
  primaryStrong: "0 8px 20px rgba(250,104,0,0.25)",
  /** Bottom bar — sombra invertida pra cima */
  bottomBar: "0 -4px 12px rgba(0,0,0,0.04)",
  /** Phone frame mockup (só em design review) */
  phoneFrame: "0 30px 80px rgba(0,0,0,0.22), 0 6px 12px rgba(0,0,0,0.08)",
} as const;

// =========================================
// MOTION
// =========================================
export const motion = {
  duration: {
    /** Hover, focus rings */
    fast: 150,
    /** Transitions padrão (background, color) */
    base: 200,
    /** Sheet open, modal */
    slow: 300,
  },
  easing: {
    /** Padrão para a maioria das transições */
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    /** Saída de elementos */
    accelerate: "cubic-bezier(0.4, 0, 1, 1)",
    /** Entrada de elementos */
    decelerate: "cubic-bezier(0, 0, 0.2, 1)",
  },
} as const;

// =========================================
// Z-INDEX
// =========================================
export const zIndex = {
  base: 1,
  /** Sticky headers, banners offline */
  sticky: 10,
  /** Dropdowns */
  dropdown: 100,
  /** Bottom sheets, modais */
  modal: 1000,
  /** Toasts, snackbars */
  toast: 9999,
} as const;

// =========================================
// BREAKPOINTS (mobile-first)
// =========================================
export const breakpoint = {
  /** Smartphones compactos (iPhone SE, Android budget) */
  sm: 360,
  /** Smartphones padrão (iPhone 13/14, S22) */
  md: 393,
  /** Tablets pequenos */
  lg: 768,
  /** Tablets grandes / desktop pequeno */
  xl: 1024,
} as const;

// =========================================
// TOUCH TARGETS
// =========================================
export const touch = {
  /** Mínimo absoluto WCAG (não usar como default) */
  min: 36,
  /** Padrão para chips, badges secundários */
  base: 40,
  /** Touch confortável — botões primários, inputs */
  comfortable: 48,
  /** Touch generoso — CTAs principais, shutter de câmera */
  large: 56,
  /** Shutter de captura */
  shutter: 72,
} as const;

// =========================================
// COMPONENT-LEVEL TOKENS
// =========================================
export const component = {
  statusBar: {
    height: 42,
    bg: colors.brand.azulNoturno,
    color: colors.text.inverse,
  },
  appHeader: {
    height: 54,
    bg: colors.neutral.surface,
    color: colors.brand.azulNoturno,
    borderBottom: `1px solid ${colors.neutral.border}`,
  },
  bottomBar: {
    minHeight: 80,
    bg: colors.neutral.surface,
    borderTop: `1px solid ${colors.neutral.border}`,
    shadow: shadow.bottomBar,
  },
  input: {
    height: 48,
    padding: "13px 14px",
    radius: radius.lg,
    border: `1px solid ${colors.neutral.border}`,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  buttonPrimary: {
    height: 50,
    bg: colors.brand.laranja360,
    color: colors.text.inverse,
    radius: radius.xl,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    shadow: shadow.primary,
  },
  buttonSecondary: {
    height: 44,
    bg: "transparent",
    color: colors.brand.azulNoturno,
    border: `1px solid ${colors.neutral.border}`,
    radius: radius.xl,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
} as const;

// =========================================
// TYPE EXPORTS
// =========================================
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Shadow = typeof shadow;
export type FontSize = typeof fontSize;
export type FontWeight = typeof fontWeight;

// =========================================
// DEFAULT EXPORT — tokens unificados
// =========================================
const tokens = {
  colors,
  fonts,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  spacing,
  radius,
  shadow,
  motion,
  zIndex,
  breakpoint,
  touch,
  component,
} as const;

export default tokens;

// =========================================
// TAILWIND 4 — cole em globals.css
// =========================================
/*

@import "tailwindcss";

@theme {
  // Brand CIMI360
  --color-laranja-360: #FA6800;
  --color-laranja-ambar: #FD9E02;
  --color-azul-atlantico: #34A9AD;
  --color-azul-noturno: #002F3F;

  // Gyros (apenas Powered by)
  --color-gyros-roxo: #7E22CE;

  // Neutrals
  --color-page-bg: #EFEFF2;
  --color-app-bg: #F4F4F6;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F8F8FA;
  --color-border-default: #E5E5E8;
  --color-border-strong: #C9C9D0;

  // Text
  --color-text-default: #1A1A1A;
  --color-text-muted: #5C5C66;
  --color-text-subtle: #9090A0;

  // Semantic
  --color-success-fg: #1B7F47;
  --color-success-bg: #E8F5EC;
  --color-success-border: #BBE2C8;
  --color-warning-fg: #92400E;
  --color-warning-bg: #FEF3E0;
  --color-warning-border: #FBD9A5;
  --color-danger-fg: #B91C1C;
  --color-danger-bg: #FDECEC;
  --color-danger-border: #F5C2C2;

  // Fonts
  --font-sans: "Montserrat", system-ui, -apple-system, sans-serif;
  --font-display: "Fraunces", Georgia, serif;

  // Spacing (já vem default no Tailwind como spacing-4 = 16px, etc — não precisa redefinir)

  // Radius
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-2xl: 14px;

  // Shadows
  --shadow-primary: 0 6px 16px rgb(250 104 0 / 0.22);
  --shadow-primary-strong: 0 8px 20px rgb(250 104 0 / 0.25);
  --shadow-bottom-bar: 0 -4px 12px rgb(0 0 0 / 0.04);
}

// Carregar Montserrat (em frontend/src/app/layout.tsx, usar next/font/google):
//
// import { Montserrat, Fraunces } from "next/font/google";
//
// const montserrat = Montserrat({
//   subsets: ["latin"],
//   weight: ["400", "500", "600", "700", "800"],
//   variable: "--font-montserrat",
// });
//
// const fraunces = Fraunces({
//   subsets: ["latin"],
//   weight: ["400", "500", "600"],
//   variable: "--font-fraunces",
// });
//
// E no <html className={`${montserrat.variable} ${fraunces.variable}`}>

*/
