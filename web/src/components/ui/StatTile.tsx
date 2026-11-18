import type { ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  accent?: "cyan" | "amber" | "none";
}

const accents = {
  cyan: "text-cyan",
  amber: "text-amber",
  none: "text-ink",
};

/** Telemetry readout: tiny mono label, big mono value. */
export default function StatTile({ label, value, unit, hint, accent = "none" }: StatTileProps) {
  return (
    <div className="rounded-md border border-line bg-space-900/60 p-4">
      <div className="eyebrow !text-ink-faint">{label}</div>
      <div className={`mt-2 flex items-baseline gap-1.5 font-mono text-2xl tabular ${accents[accent]}`}>
        {value}
        {unit && <span className="text-xs text-ink-faint">{unit}</span>}
      </div>
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">{hint}</p>}
    </div>
  );
}
