import { motion } from "framer-motion";
import { classColors, motion as motionTokens } from "../../design/tokens";
import { usePrefersReducedMotion } from "../../lib/hooks";

interface GaugeProps {
  /** 0..1 probability of CANDIDATE */
  value: number;
  size?: number;
}

const STROKE = 10;
const TICKS = 48;

/**
 * Confidence gauge drawn as an orbit: a dashed track, a progress arc, and a small "planet"
 * riding at the arc's end. Cyan above 0.5 (CANDIDATE), amber below (FALSE POSITIVE).
 */
export default function Gauge({ value, size = 220 }: GaugeProps) {
  const reducedMotion = usePrefersReducedMotion();
  const clamped = Math.min(1, Math.max(0, value));
  const isCandidate = clamped >= 0.5;
  const color = isCandidate ? classColors.candidate : classColors.falsePositive;
  const radius = (size - STROKE * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const angle = clamped * 2 * Math.PI - Math.PI / 2;
  const duration = reducedMotion ? 0 : 1.1;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped * 100)}
        aria-label="Probability that the signal is a planet candidate"
      >
        {/* Tick marks around the orbit */}
        {Array.from({ length: TICKS }).map((_, i) => {
          const a = (i / TICKS) * 2 * Math.PI;
          const inner = radius + STROKE / 2 + 4;
          const outer = inner + (i % 6 === 0 ? 7 : 3);
          return (
            <line
              key={i}
              x1={center + Math.cos(a) * inner}
              y1={center + Math.sin(a) * inner}
              x2={center + Math.cos(a) * outer}
              y2={center + Math.sin(a) * outer}
              stroke="rgba(232,236,246,0.18)"
              strokeWidth={1}
            />
          );
        })}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(232,236,246,0.08)" strokeWidth={STROKE} />
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(232,236,246,0.18)" strokeWidth={1} strokeDasharray="2 5" />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped) }}
          transition={{ duration, ease: motionTokens.ease }}
          style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
        <motion.circle
          r={STROKE * 0.8}
          fill="#05060A"
          stroke={color}
          strokeWidth={2.5}
          initial={{ cx: center, cy: center - radius, opacity: 0 }}
          animate={{ cx: center + Math.cos(angle) * radius, cy: center + Math.sin(angle) * radius, opacity: 1 }}
          transition={{ duration, ease: motionTokens.ease }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-4xl tabular" style={{ color }}>
          {(clamped * 100).toFixed(1)}
          <span className="text-lg">%</span>
        </span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">P(candidate)</span>
      </div>
    </div>
  );
}
