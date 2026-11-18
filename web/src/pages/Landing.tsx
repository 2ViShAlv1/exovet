import { motion } from "framer-motion";
import PlanetHero from "../components/space/PlanetHero";
import { OrbitDivider } from "../components/space/Orbit";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import StatTile from "../components/ui/StatTile";
import SectionHeading from "../components/ui/SectionHeading";
import { Reveal, Stagger, StaggerItem } from "../components/ui/Reveal";
import { FEATURE_LABELS } from "../lib/fields";
import { motion as tokens } from "../design/tokens";
import metrics from "../data/metrics.json";

const finalRow = metrics.comparison.find((m) => m.model === metrics.finalModel)!;
const totalRows = Object.values(metrics.classBalance).reduce((sum, part) => sum + part.candidate + part.falsePositive, 0);

const FALSE_POSITIVE_CAUSES = [
  { title: "Eclipsing binaries", body: "Two stars orbiting each other block each other's light and mimic a planet's dip." },
  { title: "Background blends", body: "Light from a nearby star leaks into the measurement and creates a fake signal." },
  { title: "Instrument noise", body: "Spacecraft systematics and pixel artefacts can look like a periodic dimming." },
];

const PIPELINE = [
  { step: "01", title: "12 measurements in", body: "Period, duration, depth, impact, SNR, planet radius and temperature, and four star properties." },
  { step: "02", title: "Physics features", body: "Log transforms plus five derived checks, like planet-to-star radius ratio and depth consistency." },
  { step: "03", title: "11 nearest neighbours", body: "The KNN model finds the 11 most similar KOIs it has seen and weighs their votes by distance." },
  { step: "04", title: "A ranked answer", body: "A probability of CANDIDATE, so astronomers can start at the top of the list." },
];

const topFeatures = metrics.permutationImportance.slice(0, 5);
const maxImportance = topFeatures[0]?.value ?? 1;

export default function Landing() {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="container-page grid min-h-[calc(100svh-var(--nav-h))] overflow-x-clip items-center gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:py-0">
        <div className="order-2 lg:order-1">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: tokens.revealDuration, ease: tokens.ease }}
          >
            Kepler signal vetting · Mission log 001
          </motion.p>
          <motion.h1
            className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.05] sm:text-6xl xl:text-7xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: tokens.revealDuration, ease: tokens.ease, delay: 0.08 }}
          >
            Is that dip a <span className="text-cyan">planet</span>, or a <span className="text-amber">false alarm</span>?
          </motion.h1>
          <motion.p
            className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: tokens.revealDuration, ease: tokens.ease, delay: 0.16 }}
          >
            ExoVet is a machine learning first filter for NASA's Kepler Objects of Interest. Give it 12 measurements of a
            transit signal and it tells you whether it looks like a planet <strong className="font-medium text-ink">candidate</strong> or
            a <strong className="font-medium text-ink">false positive</strong>.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: tokens.revealDuration, ease: tokens.ease, delay: 0.24 }}
          >
            <Button to="/predict">
              Classify a signal
              <span aria-hidden="true">→</span>
            </Button>
            <Button to="/results" variant="secondary">
              See model results
            </Button>
          </motion.div>
          <motion.dl
            className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-line pt-6 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-ink-faint">Test accuracy</dt>
              <dd className="mt-1 text-xl text-ink tabular">{(finalRow.accuracy! * 100).toFixed(2)}%</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-ink-faint">ROC-AUC</dt>
              <dd className="mt-1 text-xl text-cyan tabular">{finalRow.testAuc!.toFixed(4)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-ink-faint">Models compared</dt>
              <dd className="mt-1 text-xl text-ink tabular">{metrics.comparison.length}</dd>
            </div>
          </motion.dl>
        </div>
        <motion.div
          className="order-1 mx-auto w-full max-w-[340px] sm:max-w-[460px] lg:order-2 lg:max-w-[620px]"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: tokens.ease }}
        >
          <PlanetHero className="w-full" />
        </motion.div>
      </section>

      <OrbitDivider />

      {/* ---------------- Problem ---------------- */}
      <section className="container-page py-20">
        <SectionHeading eyebrow="The problem" title="About half of Kepler's flagged signals aren't planets.">
          Kepler watched ~150,000 stars and flagged every transit-like dip as a KOI. Checking each one by hand is slow, and
          follow-up telescope time is scarce. A fast, honest first filter lets astronomers spend that time on the best targets.
        </SectionHeading>
        <Stagger className="mt-12 grid gap-4 md:grid-cols-3">
          {FALSE_POSITIVE_CAUSES.map((cause, i) => (
            <StaggerItem key={cause.title}>
              <Card hover glass={i === 1} className="h-full">
                <p className="font-mono text-xs text-amber">FP-0{i + 1}</p>
                <h3 className="mt-3 text-lg font-semibold">{cause.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{cause.body}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="container-page py-20">
        <SectionHeading eyebrow="How it works" title="From twelve numbers to a ranked answer.">
          The same pipeline runs for every signal: build features, fill gaps with training medians, scale, then let the
          nearest neighbours vote.
        </SectionHeading>
        <Stagger className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((item) => (
            <StaggerItem key={item.step}>
              <div className="relative h-full rounded-lg border border-line bg-space-900/60 p-5">
                <span className="font-mono text-3xl text-cyan/80 tabular">{item.step}</span>
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ---------------- Telemetry strip ---------------- */}
      <section className="container-page py-12">
        <Reveal>
          <Card padding="lg" className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="eyebrow">Telemetry</p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">What the final model relies on</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Shuffle one input and watch the test ROC-AUC fall: the bigger the drop, the more the model depends on it.
                Orbital period matters most, which matches what astronomers know about false positives.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <StatTile label="Rows in dataset" value={totalRows.toLocaleString("en-US")} />
                <StatTile label="Neighbours (k)" value="11" accent="cyan" hint="distance-weighted" />
              </div>
            </div>
            <ul className="flex flex-col justify-center gap-4" aria-label="Top five features by permutation importance">
              {topFeatures.map((f, i) => (
                <li key={f.feature}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-ink">
                      <span className="mr-2 font-mono text-xs text-ink-faint">#{i + 1}</span>
                      {FEATURE_LABELS[f.feature] ?? f.feature}
                    </span>
                    <span className="font-mono text-xs text-ink-muted tabular">−{f.value.toFixed(4)} AUC</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-pill bg-space-800">
                    <motion.div
                      className="h-full rounded-pill bg-gradient-to-r from-cyan-deep to-cyan"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(f.value / maxImportance) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: tokens.ease, delay: i * 0.08 }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container-page py-20 text-center">
        <SectionHeading align="center" eyebrow="Ready when you are" title="Point ExoVet at a signal.">
          Enter the measurements yourself, load a real example from the test set, or upload a CSV of many KOIs.
        </SectionHeading>
        <Reveal delay={0.1} className="mt-8 flex justify-center">
          <Button to="/predict">
            Open the classifier <span aria-hidden="true">→</span>
          </Button>
        </Reveal>
      </section>
    </>
  );
}
