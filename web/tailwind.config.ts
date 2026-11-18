import type { Config } from "tailwindcss";
import { colors, fonts, radii, shadows, layout } from "./src/design/tokens";

/** Every value below comes from src/design/tokens.ts — edit tokens there, not here. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space: colors.space,
        nebula: colors.nebula,
        ink: colors.ink,
        cyan: colors.cyan,
        amber: colors.amber,
        danger: colors.danger,
        success: colors.success,
        line: colors.line,
        "line-strong": colors.lineStrong,
      },
      fontFamily: {
        display: [...fonts.display],
        sans: [...fonts.body],
        mono: [...fonts.mono],
      },
      borderRadius: radii,
      boxShadow: shadows,
      maxWidth: { content: layout.maxWidth },
      spacing: { nav: layout.navHeight, gutter: layout.gutter },
      keyframes: {
        "orbit-spin": { to: { transform: "rotate(360deg)" } },
        "pulse-soft": { "0%,100%": { opacity: "0.55" }, "50%": { opacity: "1" } },
        "dash-flow": { to: { strokeDashoffset: "-200" } },
      },
      animation: {
        "orbit-spin": "orbit-spin 6s linear infinite",
        "orbit-spin-slow": "orbit-spin 40s linear infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "dash-flow": "dash-flow 12s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
