import { colors, fonts } from "../../design/tokens";

/** Shared Recharts styling so every chart reads like mission-control telemetry. */
export const chart = {
  grid: { stroke: "rgba(232,236,246,0.07)", strokeDasharray: "3 6" },
  axisTick: { fill: colors.ink.faint, fontSize: 11, fontFamily: fonts.mono.join(",") },
  axisLine: { stroke: "rgba(232,236,246,0.15)" },
  tooltip: {
    contentStyle: {
      background: "rgba(9,11,19,0.92)",
      border: `1px solid ${colors.lineStrong}`,
      borderRadius: 10,
      fontFamily: fonts.mono.join(","),
      fontSize: 12,
      color: colors.ink.DEFAULT,
      boxShadow: "0 10px 30px -10px rgba(0,0,0,0.8)",
    },
    labelStyle: { color: colors.ink.muted, marginBottom: 4 },
    itemStyle: { color: colors.ink.DEFAULT, padding: 0 },
    cursor: { fill: "rgba(79,209,255,0.06)" },
  },
  legend: { wrapperStyle: { fontFamily: fonts.mono.join(","), fontSize: 11, color: colors.ink.muted } },
  series: {
    primary: colors.cyan.DEFAULT,
    secondary: colors.amber.DEFAULT,
    muted: "rgba(163,171,194,0.35)",
  },
} as const;
