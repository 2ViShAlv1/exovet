/**
 * ExoVet design tokens — the single source of truth for colour, type, radii, shadows and motion.
 *
 * Tailwind (tailwind.config.ts), the global CSS variables (via tokens → Tailwind) and the Three.js
 * scene (components/space) all import from this file. To re-skin the app, change values here only.
 */

export const colors = {
  /** Backgrounds, from deepest to raised */
  space: {
    950: "#05060A", // page background
    900: "#090B13", // panels behind glass
    850: "#0D1020",
    800: "#12162A", // raised surfaces, inputs
    700: "#1B2140",
  },
  /** Nebula tints used only in soft background gradients */
  nebula: {
    indigo: "#2B2F7A",
    violet: "#4A2A6E",
    teal: "#0E4A55",
  },
  /** Text */
  ink: {
    DEFAULT: "#E8ECF6", // primary text (contrast ≈ 16:1 on space-950)
    muted: "#A3ABC2", // secondary text (≈ 8:1)
    faint: "#7A8299", // captions, axis labels (≈ 5:1 — still AA for normal text)
  },
  /** Primary accent: electric cyan. CTAs, focus rings, CANDIDATE data state */
  cyan: {
    DEFAULT: "#4FD1FF",
    soft: "#9BE5FF",
    deep: "#1A8FC0",
  },
  /** Secondary accent: solar amber. Highlights, FALSE POSITIVE data state */
  amber: {
    DEFAULT: "#FFB547",
    soft: "#FFD18A",
    deep: "#C9821A",
  },
  /** Status (used sparingly) */
  danger: "#FF6B7A",
  success: "#5BE3A4",
  /** Hairlines on glass */
  line: "rgba(232, 236, 246, 0.10)",
  lineStrong: "rgba(232, 236, 246, 0.18)",
} as const;

/** Meaning of the two classes, used everywhere a prediction is shown */
export const classColors = {
  candidate: colors.cyan.DEFAULT,
  falsePositive: colors.amber.DEFAULT,
} as const;

export const fonts = {
  display: ['"Space Grotesk Variable"', '"Space Grotesk"', "system-ui", "sans-serif"],
  body: ['"Inter Variable"', "Inter", "system-ui", "sans-serif"],
  mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', "ui-monospace", "monospace"],
} as const;

export const radii = {
  sm: "8px",
  md: "12px",
  lg: "18px",
  xl: "26px",
  pill: "999px",
} as const;

export const shadows = {
  glass: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 50px -20px rgba(0,0,0,0.7)",
  glowCyan: "0 0 0 1px rgba(79,209,255,0.35), 0 0 28px -4px rgba(79,209,255,0.45)",
  glowAmber: "0 0 0 1px rgba(255,181,71,0.35), 0 0 28px -4px rgba(255,181,71,0.40)",
  innerGlow: "inset 0 0 40px -12px rgba(79,209,255,0.25)",
} as const;

/** Layout */
export const layout = {
  maxWidth: "1240px",
  gutter: "1rem", // 16px side gutter on phones
  navHeight: "68px",
} as const;

/** Motion: durations are in seconds (Framer Motion units) */
export const motion = {
  revealDuration: 0.6,
  revealDistance: 18, // px of upward drift on scroll reveal
  staggerChildren: 0.08,
  pageTransition: 0.32, // "warp" — must stay under 0.4s
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  magneticStrength: 0.28, // how far a magnetic button follows the cursor (fraction of offset)
} as const;

/** 3D scene */
export const scene = {
  maxPixelRatio: 2,
  planetRotationSpeed: 0.045, // radians per second
  moonOrbitSpeed: 0.22,
  tiltStrength: 0.18, // radians of parallax tilt at the screen edge
  planet: {
    deep: "#0B2A4A",
    mid: "#1E5C8A",
    light: "#7FD6E8",
    sand: "#C99A5B",
    atmosphere: colors.cyan.DEFAULT,
    ring: colors.amber.soft,
  },
} as const;

/** Starfield */
export const starfield = {
  layers: [
    { count: 260, size: [0.4, 0.9], speed: 0.012, alpha: 0.55 }, // far
    { count: 120, size: [0.8, 1.4], speed: 0.03, alpha: 0.75 }, // mid
    { count: 45, size: [1.2, 2.0], speed: 0.06, alpha: 0.95 }, // near
  ],
  twinkleSpeed: 1.6,
  shootingStarEvery: [7, 14] as [number, number], // seconds, random in range
  mouseParallax: 24, // px the near layer moves at the screen edge
} as const;

/** Breakpoints, matching Tailwind's defaults */
export const breakpoints = {
  mobile: 768,
} as const;
