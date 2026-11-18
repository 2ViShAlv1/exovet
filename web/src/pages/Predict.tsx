import { useRef, useState, type FormEvent, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Gauge from "../components/ui/Gauge";
import StatTile from "../components/ui/StatTile";
import SectionHeading from "../components/ui/SectionHeading";
import { OrbitLoader } from "../components/space/Orbit";
import { chart } from "../components/ui/chartTheme";
import { api, ApiError, MODEL_OPTIONS, type ModelKey, type Prediction } from "../lib/api";
import { FIELDS, FIELD_KEYS, GROUPS, FEATURE_LABELS, formatNumber, parseCsv, type FieldKey } from "../lib/fields";
import { classColors } from "../design/tokens";

type Values = Record<FieldKey, string>;
type Status = { kind: "idle" } | { kind: "loading" } | { kind: "error"; error: ApiError } | { kind: "done"; result: Prediction; trueLabel?: string };
type BatchStatus =
  | { kind: "idle" }
  | { kind: "loading"; fileName: string }
  | { kind: "error"; message: string; offline?: boolean }
  | { kind: "done"; fileName: string; rows: Partial<Record<FieldKey, number | null>>[]; results: Prediction[] };

const EMPTY: Values = Object.fromEntries(FIELD_KEYS.map((k) => [k, ""])) as Values;
const MAX_BATCH_ROWS = 500;

function toPayload(values: Values) {
  return Object.fromEntries(FIELD_KEYS.map((k) => [k, values[k].trim() === "" ? null : Number(values[k])]));
}

// ------------------------------------------------------------------------------------------------
// States for the result panel
// ------------------------------------------------------------------------------------------------
function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-14 text-center">
      <svg width="150" height="90" viewBox="0 0 150 90" aria-hidden="true" className="opacity-80">
        <path d="M0 30 H55 C62 30 62 62 70 62 H80 C88 62 88 30 95 30 H150" fill="none" stroke="#4FD1FF" strokeWidth="1.5" strokeDasharray="3 4" />
        <circle cx="75" cy="62" r="3" fill="#FFB547" />
        <ellipse cx="75" cy="30" rx="70" ry="22" fill="none" stroke="rgba(232,236,246,0.1)" />
      </svg>
      <h3 className="mt-6 text-lg font-semibold">Awaiting a signal</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">
        Fill in the measurements or load a real example from the test set, then press <span className="text-ink">Analyze</span>.
      </p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full border border-amber/50 text-2xl text-amber" aria-hidden="true">
        !
      </div>
      <h3 className="mt-5 text-lg font-semibold">{error.kind === "offline" ? "Lost contact with the API" : "The model couldn't read that signal"}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">{error.message}</p>
      {error.kind === "offline" && (
        <div className="mt-4 w-full max-w-sm rounded-md border border-line bg-space-950/80 p-3 text-left font-mono text-xs text-ink-muted">
          <span className="text-ink-faint"># from the project folder</span>
          <br />
          .venv\Scripts\python api\server.py
        </div>
      )}
      <div className="mt-5">
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

function PercentileChart({ result }: { result: Prediction }) {
  const data = FIELDS.map((f) => ({ name: f.label, percentile: result.percentiles[f.key] }))
    .filter((d) => d.percentile !== null)
    .map((d) => ({ ...d, percentile: d.percentile as number }));
  return (
    <div className="h-[340px] w-full" role="img" aria-label="Where each input sits within the training data, as a percentile">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
          <CartesianGrid {...chart.grid} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={chart.axisTick} axisLine={chart.axisLine} tickLine={false} unit="%" />
          <YAxis type="category" dataKey="name" width={150} tick={chart.axisTick} axisLine={false} tickLine={false} />
          <Tooltip {...chart.tooltip} formatter={(v: number) => [`${v.toFixed(1)}th percentile`, "Training data"]} />
          <ReferenceLine x={50} stroke="rgba(232,236,246,0.25)" strokeDasharray="4 4" />
          <Bar dataKey="percentile" radius={[0, 4, 4, 0]} barSize={10} isAnimationActive>
            {data.map((d) => (
              <Cell key={d.name} fill={d.percentile < 2 || d.percentile > 98 ? chart.series.secondary : chart.series.primary} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ResultView({ result, trueLabel }: { result: Prediction; trueLabel?: string }) {
  const isCandidate = result.label === "CANDIDATE";
  const color = isCandidate ? classColors.candidate : classColors.falsePositive;
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <Gauge value={result.score} size={200} />
        <div className="text-center sm:text-left">
          <p className="eyebrow !text-ink-faint">Classification</p>
          <p className="mt-2 font-display text-3xl font-semibold" style={{ color }}>
            {isCandidate ? "Planet candidate" : "False positive"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {result.neighbourVotes
              ? `${result.neighbourVotes.candidate} of 11 nearest neighbours are candidates. Closer neighbours count for more.`
              : `The neural network gives this signal a ${(result.score * 100).toFixed(1)}% chance of being a planet candidate.`}
          </p>
          {trueLabel && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-pill border border-line px-3 py-1 font-mono text-xs text-ink-muted">
              NASA label: <span className={trueLabel === "CANDIDATE" ? "text-cyan" : "text-amber"}>{trueLabel}</span>
              {trueLabel === result.label ? <span className="text-success">✓ match</span> : <span className="text-danger">✗ miss</span>}
            </p>
          )}
        </div>
      </div>

      {/* Neighbour votes as a row of planets (KNN only) */}
      {result.neighbours.length > 0 && (
      <div>
        <p className="eyebrow !text-ink-faint">Nearest-neighbour votes</p>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="The 11 nearest training signals and their labels">
          {result.neighbours.map((n, i) => (
            <li
              key={i}
              title={`${n.label} · distance ${n.distance.toFixed(3)}`}
              className={`grid h-9 w-9 place-items-center rounded-full border font-mono text-[10px] ${
                n.label === "CANDIDATE" ? "border-cyan/60 bg-cyan/10 text-cyan" : "border-amber/60 bg-amber/10 text-amber"
              }`}
            >
              <span className="sr-only">{n.label}, distance </span>
              {n.distance.toFixed(1)}
            </li>
          ))}
        </ul>
        <p className="mt-2 font-mono text-[11px] text-ink-faint">Number = distance in scaled feature space (smaller = more similar)</p>
      </div>
      )}

      <div>
        <p className="eyebrow !text-ink-faint">Physics checks</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(result.derived)
            .slice(0, 4)
            .map(([key, d]) => (
              <StatTile key={key} label={FEATURE_LABELS[key] ?? key} value={formatNumber(d.value, 3)} hint={d.hint} />
            ))}
        </div>
      </div>

      <div>
        <p className="eyebrow !text-ink-faint">Inputs vs. training data</p>
        <p className="mt-1 text-xs text-ink-faint">Amber bars are extreme values (below the 2nd or above the 98th percentile).</p>
        <div className="mt-3">
          <PercentileChart result={result} />
        </div>
      </div>
      {result.missing.length > 0 && (
        <p className="rounded-md border border-amber/30 bg-amber/5 p-3 text-xs text-amber-soft">
          {result.missing.length} value(s) were empty and filled with the training median: {result.missing.join(", ")}.
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Batch upload
// ------------------------------------------------------------------------------------------------
function BatchPanel({ model }: { model: ModelKey }) {
  const [status, setStatus] = useState<BatchStatus>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setStatus({ kind: "error", message: "Please choose a .csv file." });
      return;
    }
    setStatus({ kind: "loading", fileName: file.name });
    const { rows, missingColumns } = parseCsv(await file.text());
    if (rows.length === 0) {
      setStatus({ kind: "error", message: "That file has no data rows." });
      return;
    }
    if (missingColumns.length === FIELD_KEYS.length) {
      setStatus({ kind: "error", message: "None of the 12 expected column names were found in the header row." });
      return;
    }
    const limited = rows.slice(0, MAX_BATCH_ROWS);
    try {
      const { results } = await api.predict(limited, model);
      setStatus({ kind: "done", fileName: file.name, rows: limited, results });
    } catch (e) {
      const error = e as ApiError;
      setStatus({ kind: "error", message: error.message, offline: error.kind === "offline" });
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const download = () => {
    if (status.kind !== "done") return;
    const header = [...FIELD_KEYS, "exovet_label", "exovet_score"].join(",");
    const lines = status.rows.map((row, i) =>
      [...FIELD_KEYS.map((k) => row[k] ?? ""), status.results[i].label, status.results[i].score].join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = status.fileName.replace(/\.csv$/i, "") + "_exovet.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const candidates = status.kind === "done" ? status.results.filter((r) => r.label === "CANDIDATE").length : 0;

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-cyan bg-cyan/5" : "border-line-strong"
        }`}
      >
        <p className="font-display text-lg font-semibold">Drop a CSV of KOIs here</p>
        <p className="mt-2 max-w-md text-sm text-ink-muted">
          One row per signal, with a header row using the 12 column names (e.g. <code className="font-mono text-xs text-cyan-soft">koi_period</code>).
          Up to {MAX_BATCH_ROWS} rows. Other columns are ignored.
        </p>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          id="csv-upload"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <div className="mt-5">
          <Button variant="secondary" onClick={() => input.current?.click()}>
            Choose file
          </Button>
        </div>
      </div>

      {status.kind === "loading" && <OrbitLoader label={`Analyzing ${status.fileName}…`} />}
      {status.kind === "error" && (
        <div role="alert" className="rounded-md border border-amber/40 bg-amber/5 p-4 text-sm text-amber-soft">
          {status.message}
          {status.offline && <span className="mt-1 block font-mono text-xs text-ink-muted">.venv\Scripts\python api\server.py</span>}
        </div>
      )}
      {status.kind === "done" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Signals" value={status.results.length} />
            <StatTile label="Candidates" value={candidates} accent="cyan" />
            <StatTile label="False positives" value={status.results.length - candidates} accent="amber" />
          </div>
          <div className="max-h-[420px] overflow-auto rounded-md border border-line">
            <table className="w-full min-w-[520px] text-left text-sm">
              <caption className="sr-only">Batch predictions</caption>
              <thead className="sticky top-0 bg-space-900 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                <tr>
                  <th scope="col" className="px-3 py-2">#</th>
                  <th scope="col" className="px-3 py-2">Period (d)</th>
                  <th scope="col" className="px-3 py-2">Radius (R⊕)</th>
                  <th scope="col" className="px-3 py-2">Label</th>
                  <th scope="col" className="px-3 py-2 text-right">P(candidate)</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {status.results.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2 text-ink-faint">{i + 1}</td>
                    <td className="px-3 py-2">{formatNumber(status.rows[i].koi_period ?? null, 3)}</td>
                    <td className="px-3 py-2">{formatNumber(status.rows[i].koi_prad ?? null, 2)}</td>
                    <td className={`px-3 py-2 ${r.label === "CANDIDATE" ? "text-cyan" : "text-amber"}`}>{r.label}</td>
                    <td className="px-3 py-2 text-right tabular">{r.score.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="secondary" onClick={download}>
            Download results CSV
          </Button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Page
// ------------------------------------------------------------------------------------------------
export default function Predict() {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [model, setModel] = useState<ModelKey>("mlp");
  const [values, setValues] = useState<Values>(EMPTY);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [trueLabel, setTrueLabel] = useState<string | undefined>();
  const [sampling, setSampling] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const filled = FIELD_KEYS.filter((k) => values[k].trim() !== "").length;

  const analyze = async (event?: FormEvent) => {
    event?.preventDefault();
    if (filled === 0) return;
    setStatus({ kind: "loading" });
    // On phones the result panel is below the form: bring it into view
    if (window.innerWidth < 1024) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const { results } = await api.predict([toPayload(values)], model);
      setStatus({ kind: "done", result: results[0], trueLabel });
    } catch (e) {
      setStatus({ kind: "error", error: e as ApiError });
    }
  };

  const loadSample = async (label?: 0 | 1) => {
    setSampling(true);
    try {
      const sample = await api.sample(model, label);
      setValues(Object.fromEntries(FIELD_KEYS.map((k) => [k, sample.values[k] === null ? "" : String(sample.values[k])])) as Values);
      setTrueLabel(sample.trueLabel);
      setStatus({ kind: "idle" });
    } catch (e) {
      setStatus({ kind: "error", error: e as ApiError });
    } finally {
      setSampling(false);
    }
  };

  const onChange = (key: FieldKey, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setTrueLabel(undefined); // edited by hand: no longer the NASA example
  };

  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading as="h1" eyebrow="Classifier console" title="Classify a Kepler signal">
        Enter what you know about one KOI. Empty fields are allowed: the model fills them with the training median, just as it
        did during training.
      </SectionHeading>

      {/* Mode switch */}
      <div role="tablist" aria-label="Input mode" className="mt-8 inline-flex rounded-pill border border-line bg-space-900/70 p-1">
        {(["single", "batch"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            aria-controls={`panel-${m}`}
            id={`tab-${m}`}
            onClick={() => setMode(m)}
            className={`relative rounded-pill px-4 py-1.5 text-sm transition-colors ${mode === m ? "text-space-950" : "text-ink-muted hover:text-ink"}`}
          >
            {mode === m && <motion.span layoutId="mode-pill" className="absolute inset-0 -z-0 rounded-pill bg-cyan" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
            <span className="relative">{m === "single" ? "Single signal" : "Batch CSV"}</span>
          </button>
        ))}
      </div>

      {/* Model switch: a changed model makes the shown result stale, so it is cleared */}
      <div role="radiogroup" aria-label="Model" className="mt-4 flex flex-wrap gap-2">
        {MODEL_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={model === option.key}
            onClick={() => {
              setModel(option.key);
              setStatus({ kind: "idle" });
              setTrueLabel(undefined);
            }}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
              model === option.key ? "border-cyan/70 bg-cyan/10 text-ink" : "border-line text-ink-muted hover:text-ink"
            }`}
          >
            <span className="block text-sm font-medium">{option.label}</span>
            <span className="block text-[11px] text-ink-faint">{option.blurb}</span>
          </button>
        ))}
      </div>

      {mode === "batch" ? (
        <Card id="panel-batch" role="tabpanel" aria-labelledby="tab-batch" className="mt-6" padding="lg">
          <BatchPanel key={model} model={model} />
        </Card>
      ) : (
        <div id="panel-single" role="tabpanel" aria-labelledby="tab-single" className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
          {/* ---------- Form ---------- */}
          <Card padding="lg" glass={false}>
            <form onSubmit={analyze} noValidate>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" magnetic={false} onClick={() => loadSample(1)} disabled={sampling}>
                  <span className="h-2 w-2 rounded-full bg-cyan" aria-hidden="true" /> Load a candidate
                </Button>
                <Button variant="secondary" magnetic={false} onClick={() => loadSample(0)} disabled={sampling}>
                  <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" /> Load a false positive
                </Button>
                <Button
                  variant="ghost"
                  magnetic={false}
                  onClick={() => {
                    setValues(EMPTY);
                    setTrueLabel(undefined);
                    setStatus({ kind: "idle" });
                  }}
                >
                  Clear
                </Button>
              </div>
              {trueLabel && (
                <p className="mt-3 font-mono text-xs text-ink-faint">Loaded a random KOI from the test set (the model never trained on it).</p>
              )}

              {GROUPS.map((group) => (
                <fieldset key={group.id} className="mt-7">
                  <legend className="eyebrow !text-ink-faint">{group.title}</legend>
                  <div className="mt-3 grid gap-x-4 gap-y-4 sm:grid-cols-2">
                    {FIELDS.filter((f) => f.group === group.id).map((field) => (
                      <label key={field.key} className="block">
                        <span className="flex items-baseline justify-between gap-2 text-sm text-ink">
                          {field.label}
                          {field.unit && <span className="font-mono text-[11px] text-ink-faint">{field.unit}</span>}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          name={field.key}
                          value={values[field.key]}
                          onChange={(e) => onChange(field.key, e.target.value)}
                          placeholder={`e.g. ${field.example}`}
                          className="field-input mt-1.5"
                          aria-describedby={`${field.key}-hint`}
                        />
                        <span id={`${field.key}-hint`} className="mt-1 block text-[11px] text-ink-faint">
                          {field.hint}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
                <p className="font-mono text-xs text-ink-faint">
                  <span className="text-ink tabular">{filled}</span>/12 measurements
                </p>
                <Button type="submit" disabled={filled === 0 || status.kind === "loading"}>
                  Analyze signal <span aria-hidden="true">→</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* ---------- Result ---------- */}
          <div ref={resultRef} className="scroll-mt-24">
            <Card padding="lg" className="min-h-[420px] lg:sticky lg:top-24" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div
                  key={status.kind}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {status.kind === "idle" && <EmptyState />}
                  {status.kind === "loading" && <OrbitLoader />}
                  {status.kind === "error" && <ErrorState error={status.error} onRetry={() => (filled ? analyze() : setStatus({ kind: "idle" }))} />}
                  {status.kind === "done" && <ResultView result={status.result} trueLabel={status.trueLabel} />}
                </motion.div>
              </AnimatePresence>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
