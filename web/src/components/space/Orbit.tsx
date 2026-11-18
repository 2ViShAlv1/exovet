import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../../lib/hooks";

/** A thin animated orbital ellipse used as a section divider. */
export function OrbitDivider({ className = "" }: { className?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div aria-hidden="true" className={`relative mx-auto h-16 w-full max-w-content overflow-hidden ${className}`}>
      <svg viewBox="0 0 1200 64" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="orbit-fade" x1="0" x2="1">
            <stop offset="0" stopColor="#4FD1FF" stopOpacity="0" />
            <stop offset="0.5" stopColor="#4FD1FF" stopOpacity="0.55" />
            <stop offset="1" stopColor="#4FD1FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <ellipse cx="600" cy="32" rx="590" ry="22" fill="none" stroke="url(#orbit-fade)" strokeWidth="1" strokeDasharray="2 6" className={reducedMotion ? "" : "animate-dash-flow"} />
        <ellipse cx="600" cy="32" rx="420" ry="12" fill="none" stroke="rgba(232,236,246,0.08)" strokeWidth="1" />
      </svg>
      {!reducedMotion && (
        <motion.span
          className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber shadow-glowAmber"
          initial={{ left: "2%" }}
          animate={{ left: ["2%", "98%", "2%"] }}
          transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
        />
      )}
    </div>
  );
}

/** Loader: a planet orbiting a star, with a status line. */
export function OrbitLoader({ label = "Analyzing transit signal…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-5 py-10">
      <div className="relative h-28 w-28">
        <div className="absolute inset-0 rounded-full border border-dashed border-cyan/25" />
        <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber shadow-glowAmber" />
        <div className="absolute inset-0 animate-orbit-spin">
          <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan shadow-glowCyan" />
        </div>
      </div>
      <p className="font-mono text-xs tracking-wider text-ink-muted">{label}</p>
    </div>
  );
}
