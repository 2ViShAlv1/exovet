/** The 12 measurements the model reads, with plain-English labels for the UI. */

export const FIELDS = [
  { key: "koi_period", label: "Orbital period", unit: "days", group: "transit", hint: "Time between two dips", example: 9.24 },
  { key: "koi_duration", label: "Transit duration", unit: "hours", group: "transit", hint: "How long one dip lasts", example: 3.76 },
  { key: "koi_depth", label: "Transit depth", unit: "ppm", group: "transit", hint: "How much the star dims", example: 397 },
  { key: "koi_impact", label: "Impact parameter", unit: "", group: "transit", hint: "0 = crosses the star's centre", example: 0.53 },
  { key: "koi_model_snr", label: "Signal-to-noise", unit: "", group: "transit", hint: "How clearly the dip stands out", example: 22.7 },
  { key: "koi_prad", label: "Planet radius", unit: "R⊕", group: "planet", hint: "In Earth radii", example: 2.23 },
  { key: "koi_teq", label: "Equilibrium temp.", unit: "K", group: "planet", hint: "Estimated planet temperature", example: 868 },
  { key: "koi_insol", label: "Insolation", unit: "S⊕", group: "planet", hint: "Starlight received (Earth = 1)", example: 135 },
  { key: "koi_steff", label: "Star temperature", unit: "K", group: "star", hint: "Surface temperature", example: 5776 },
  { key: "koi_slogg", label: "Star surface gravity", unit: "log g", group: "star", hint: "log10(cm/s²)", example: 4.45 },
  { key: "koi_srad", label: "Star radius", unit: "R☉", group: "star", hint: "In Sun radii", example: 0.99 },
  { key: "koi_kepmag", label: "Kepler magnitude", unit: "mag", group: "star", hint: "Bigger = fainter", example: 14.6 },
] as const;

export type FieldKey = (typeof FIELDS)[number]["key"];
export const FIELD_KEYS: FieldKey[] = FIELDS.map((f) => f.key);

export const GROUPS = [
  { id: "transit", title: "Transit signal" },
  { id: "planet", title: "Planet" },
  { id: "star", title: "Host star" },
] as const;

/** Readable names for model features (including the derived ones) */
export const FEATURE_LABELS: Record<string, string> = {
  koi_impact: "Impact parameter",
  koi_teq: "Equilibrium temp.",
  koi_steff: "Star temperature",
  koi_slogg: "Star surface gravity",
  koi_kepmag: "Kepler magnitude",
  log_koi_period: "Orbital period (log)",
  log_koi_duration: "Transit duration (log)",
  log_koi_depth: "Transit depth (log)",
  log_koi_prad: "Planet radius (log)",
  log_koi_model_snr: "Signal-to-noise (log)",
  log_koi_srad: "Star radius (log)",
  log_transit_depth_per_hour: "Depth per hour",
  log_planet_star_radius_ratio: "Planet/star radius ratio",
  log_snr_per_transit: "SNR per transit",
  log_duration_ratio: "Duration ratio",
  depth_consistency: "Depth consistency",
};

/** Parse a CSV file with a header row into records keyed by the 12 field names. */
export function parseCsv(text: string): { rows: Partial<Record<FieldKey, number | null>>[]; missingColumns: FieldKey[] } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], missingColumns: FIELD_KEYS };
  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const missingColumns = FIELD_KEYS.filter((k) => !header.includes(k));
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    const record: Partial<Record<FieldKey, number | null>> = {};
    for (const key of FIELD_KEYS) {
      const index = header.indexOf(key);
      const raw = index >= 0 ? cells[index]?.trim().replace(/^"|"$/g, "") : "";
      const value = raw === "" || raw === undefined ? null : Number(raw);
      record[key] = value === null || Number.isNaN(value) ? null : value;
    }
    return record;
  });
  return { rows, missingColumns };
}

/** Compact number formatting for telemetry readouts */
export function formatNumber(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) return value.toExponential(2);
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}
