import { useState } from "react";
import {
  Area,
  ComposedChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "../components/ui/Card";
import StatTile from "../components/ui/StatTile";
import SectionHeading from "../components/ui/SectionHeading";
import { Reveal, Stagger, StaggerItem } from "../components/ui/Reveal";
import { OrbitDivider } from "../components/space/Orbit";
import { chart } from "../components/ui/chartTheme";
import { FEATURE_LABELS } from "../lib/fields";
import metrics from "../data/metrics.json";

const final = metrics.comparison.find((m) => m.model === metrics.finalModel)!;
const { confusion, roc, scoreHistogram, rows: testRows } = metrics.knnTest;
const AUC_AXIS_MIN = 0.84;
const ROC_TICKS = [0, 0.25, 0.5, 0.75, 1];

const comparisonData = [...metrics.comparison]
  .sort((a, b) => (b.testAuc ?? 0) - (a.testAuc ?? 0))
  .map((m) => ({ ...m, short: m.model.replace("Network seed ensemble", "Seed ensemble").replace(" (batch norm)", "") }));

function pct(v: number | null | undefined, digits = 2) {
  return v === null || v === undefined ? "—" : `${(v * 100).toFixed(digits)}%`;
}

function ChartCard({ title, eyebrow, children, note }: { title: string; eyebrow: string; children: React.ReactNode; note?: string }) {
  return (
    <Card glass={false} padding="lg" className="h-full">
      <p className="eyebrow">{eyebrow}</p>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      {note && <p className="mt-1 text-sm text-ink-muted">{note}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function ConfusionMatrix() {
  const cells = [
    { label: "True negative", sub: "FP called FP", value: confusion.tn, good: true },
    { label: "False alarm", sub: "FP called candidate", value: confusion.fp, good: false },
    { label: "Missed", sub: "Candidate called FP", value: confusion.fn, good: false },
    { label: "True positive", sub: "Candidate called candidate", value: confusion.tp, good: true },
  ];
  const maxValue = Math.max(...cells.map((c) => c.value));
  return (
    <div>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-center">
        <div />
        <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">Predicted FP</div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">Predicted candidate</div>
        {[0, 1].map((row) => (
          <div key={row} className="contents">
            <div className="flex items-center justify-end pr-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint [writing-mode:vertical-rl] sm:[writing-mode:horizontal-tb]">
              {row === 0 ? "Actual FP" : "Actual cand."}
            </div>
            {cells.slice(row * 2, row * 2 + 2).map((c) => (
              <div
                key={c.label}
                className={`rounded-md border p-4 ${c.good ? "border-cyan/40" : "border-amber/40"}`}
                style={{ background: c.good ? `rgba(79,209,255,${0.06 + 0.22 * (c.value / maxValue)})` : `rgba(255,181,71,${0.08 + 0.5 * (c.value / maxValue)})` }}
              >
                <div className={`font-mono text-2xl tabular sm:text-3xl ${c.good ? "text-cyan" : "text-amber"}`}>{c.value.toLocaleString("en-US")}</div>
                <div className="mt-1 text-xs text-ink">{c.label}</div>
                <div className="text-[11px] text-ink-faint">{c.sub}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-4 font-mono text-xs text-ink-faint">
        {(confusion.tn + confusion.tp).toLocaleString("en-US")} of {testRows.toLocaleString("en-US")} test rows correct ·{" "}
        {confusion.fp + confusion.fn} mistakes
      </p>
    </div>
  );
}

export default function Results() {
  const [importance, setImportance] = useState<"permutation" | "forest">("permutation");
  const importanceData = (importance === "permutation" ? metrics.permutationImportance : metrics.forestImportance).map((d) => ({
    name: FEATURE_LABELS[d.feature] ?? d.feature,
    value: d.value,
  }));

  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading as="h1" eyebrow="Mission telemetry" title="How well does ExoVet work?">
        Nine models were trained, regularized, tuned and compared. The final model was chosen on validation scores by a rule
        fixed in advance ({metrics.selectionRule}), then tested once on {testRows.toLocaleString("en-US")} rows it had never seen.
      </SectionHeading>

      {/* ---------- KPI tiles ---------- */}
      <Stagger className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StaggerItem className="col-span-2 md:col-span-1 lg:col-span-1">
          <StatTile label="Final model" value="KNN" accent="cyan" hint="k = 11, distance-weighted" />
        </StaggerItem>
        <StaggerItem>
          <StatTile label="ROC-AUC" value={final.testAuc!.toFixed(4)} accent="cyan" hint={`95% CI ${final.aucLow} – ${final.aucHigh}`} />
        </StaggerItem>
        <StaggerItem>
          <StatTile label="Accuracy" value={pct(final.accuracy)} />
        </StaggerItem>
        <StaggerItem>
          <StatTile label="Precision" value={pct(final.precision)} hint="of predicted candidates" />
        </StaggerItem>
        <StaggerItem>
          <StatTile label="Recall" value={pct(final.recall)} hint="of real candidates found" />
        </StaggerItem>
        <StaggerItem>
          <StatTile label="F1 score" value={pct(final.f1)} />
        </StaggerItem>
      </Stagger>

      <OrbitDivider className="my-10" />

      {/* ---------- Model comparison ---------- */}
      <Reveal>
        <ChartCard eyebrow="Leaderboard" title="Test ROC-AUC of all nine models" note="The top four are within 0.004 of each other; their 95% intervals overlap.">
          <div className="h-[360px]" role="img" aria-label="Bar chart of test ROC-AUC for nine models; KNN is highest at 0.9935">
            <ResponsiveContainer>
              <BarChart data={comparisonData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid {...chart.grid} horizontal={false} />
                <XAxis type="number" domain={[AUC_AXIS_MIN, 1]} tick={chart.axisTick} axisLine={chart.axisLine} tickLine={false} tickFormatter={(v: number) => v.toFixed(2)} />
                <YAxis type="category" dataKey="short" width={140} tick={chart.axisTick} axisLine={false} tickLine={false} />
                <Tooltip {...chart.tooltip} formatter={(v: number) => [v.toFixed(4), "Test ROC-AUC"]} />
                <Bar dataKey="testAuc" radius={[0, 4, 4, 0]} barSize={14}>
                  {comparisonData.map((m) => (
                    <Cell key={m.model} fill={m.model === metrics.finalModel ? chart.series.primary : chart.series.muted} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Validation and test scores for all nine models</caption>
              <thead className="bg-space-900 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                <tr>
                  {["Model", "Val AUC", "Test AUC", "Accuracy", "Precision", "Recall", "F1", "AUC 95% CI"].map((h, i) => (
                    <th key={h} scope="col" className={`px-3 py-2.5 ${i > 0 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono text-xs tabular">
                {comparisonData.map((m) => {
                  const isFinal = m.model === metrics.finalModel;
                  return (
                    <tr key={m.model} className={`border-t border-line ${isFinal ? "bg-cyan/5 text-cyan" : ""}`}>
                      <th scope="row" className="px-3 py-2 text-left font-sans text-sm font-normal">
                        {m.model} {isFinal && <span className="ml-1 rounded-pill border border-cyan/50 px-1.5 py-0.5 font-mono text-[10px]">FINAL</span>}
                      </th>
                      <td className="px-3 py-2 text-right">{m.valAuc?.toFixed(4)}</td>
                      <td className="px-3 py-2 text-right">{m.testAuc?.toFixed(4)}</td>
                      <td className="px-3 py-2 text-right">{m.accuracy?.toFixed(4)}</td>
                      <td className="px-3 py-2 text-right">{m.precision?.toFixed(4)}</td>
                      <td className="px-3 py-2 text-right">{m.recall?.toFixed(4)}</td>
                      <td className="px-3 py-2 text-right">{m.f1?.toFixed(4)}</td>
                      <td className="px-3 py-2 text-right text-ink-faint">{m.aucLow?.toFixed(4)} – {m.aucHigh?.toFixed(4)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </Reveal>

      {/* ---------- ROC + confusion ---------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <ChartCard eyebrow="ROC curve · KNN" title="Ranking quality at every threshold" note="The closer to the top-left corner, the better. The diagonal is random guessing.">
            <div className="h-[300px]" role="img" aria-label={`ROC curve for the KNN model, area under the curve ${final.testAuc}`}>
              <ResponsiveContainer>
                <ComposedChart data={roc} margin={{ top: 8, right: 12, bottom: 16, left: 0 }}>
                  <defs>
                    <linearGradient id="roc-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chart.series.primary} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={chart.series.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...chart.grid} />
                  <XAxis dataKey="fpr" type="number" domain={[0, 1]} tick={chart.axisTick} axisLine={chart.axisLine} tickLine={false} ticks={ROC_TICKS} tickFormatter={(v: number) => v.toFixed(2)} label={{ value: "False positive rate", position: "insideBottom", offset: -8, fill: chart.axisTick.fill, fontSize: 11 }} />
                  <YAxis dataKey="tpr" type="number" domain={[0, 1]} tick={chart.axisTick} axisLine={chart.axisLine} tickLine={false} ticks={ROC_TICKS} tickFormatter={(v: number) => v.toFixed(2)} width={40} />
                  <Tooltip {...chart.tooltip} formatter={(v: number, n: string) => [v.toFixed(3), n === "tpr" ? "True positive rate" : n]} labelFormatter={(v: number) => `FPR ${Number(v).toFixed(3)}`} />
                  <Line data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]} dataKey="tpr" stroke="rgba(232,236,246,0.25)" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                  <Area type="stepAfter" dataKey="tpr" stroke={chart.series.primary} strokeWidth={2} fill="url(#roc-fill)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </Reveal>
        <Reveal delay={0.05}>
          <ChartCard eyebrow="Confusion matrix · KNN" title="What kind of mistakes it makes" note="Precision and recall are both near 0.97, so the model is balanced at the default 0.5 threshold.">
            <ConfusionMatrix />
          </ChartCard>
        </Reveal>
      </div>

      {/* ---------- Score histogram + importance ---------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <ChartCard eyebrow="Score distribution · KNN" title="How confident are the predictions?" note="Most test signals get a score near 0 or 1; few sit in the uncertain middle.">
            <div className="h-[300px]" role="img" aria-label="Stacked histogram of KNN scores on the test set by true class">
              <ResponsiveContainer>
                <BarChart data={scoreHistogram} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid {...chart.grid} vertical={false} />
                  <XAxis dataKey="bin" tick={{ ...chart.axisTick, fontSize: 9 }} axisLine={chart.axisLine} tickLine={false} interval={0} angle={-30} textAnchor="end" height={44} />
                  <YAxis tick={chart.axisTick} axisLine={false} tickLine={false} width={44} />
                  <Tooltip {...chart.tooltip} />
                  <Legend {...chart.legend} />
                  <Bar dataKey="falsePositive" name="True FP" stackId="s" fill={chart.series.secondary} />
                  <Bar dataKey="candidate" name="True candidate" stackId="s" fill={chart.series.primary} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </Reveal>
        <Reveal delay={0.05}>
          <ChartCard eyebrow="Feature importance" title="Which inputs matter most?">
            <div role="radiogroup" aria-label="Importance method" className="mb-4 inline-flex rounded-pill border border-line bg-space-900/70 p-1 text-xs">
              {(["permutation", "forest"] as const).map((k) => (
                <button
                  key={k}
                  role="radio"
                  aria-checked={importance === k}
                  onClick={() => setImportance(k)}
                  className={`rounded-pill px-3 py-1 transition-colors ${importance === k ? "bg-cyan text-space-950" : "text-ink-muted hover:text-ink"}`}
                >
                  {k === "permutation" ? "Permutation (KNN)" : "Built-in (Random Forest)"}
                </button>
              ))}
            </div>
            <div className="h-[380px]" role="img" aria-label={`${importance} importance of the 16 model features`}>
              <ResponsiveContainer>
                <BarChart data={importanceData} layout="vertical" margin={{ left: 4, right: 16 }}>
                  <CartesianGrid {...chart.grid} horizontal={false} />
                  <XAxis type="number" tick={chart.axisTick} axisLine={chart.axisLine} tickLine={false} tickFormatter={(v: number) => v.toFixed(2)} />
                  <YAxis type="category" dataKey="name" width={178} tick={{ ...chart.axisTick, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                  <Tooltip {...chart.tooltip} formatter={(v: number) => [v.toFixed(4), importance === "permutation" ? "Drop in test AUC" : "Share of impurity reduction"]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10} fill={importance === "permutation" ? chart.series.primary : chart.series.secondary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </Reveal>
      </div>

      <Reveal>
        <Card className="mt-6" padding="lg">
          <p className="eyebrow">Reading these numbers honestly</p>
          <ul className="mt-3 grid gap-3 text-sm leading-relaxed text-ink-muted md:grid-cols-3">
            <li>
              <span className="text-ink">The label isn't ground truth.</span> It records NASA's automated vetting outcome, not a
              confirmed planet.
            </li>
            <li>
              <span className="text-ink">Close neighbours.</span> Many rows have very similar rows on both sides of the random split,
              which suits KNN. Truly unusual KOIs could score lower.
            </li>
            <li>
              <span className="text-ink">One split.</span> Each score comes from a single train / validation / test split, so the
              95% intervals show how much luck is involved.
            </li>
          </ul>
        </Card>
      </Reveal>
    </div>
  );
}
