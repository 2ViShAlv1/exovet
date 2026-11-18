import { motion } from "framer-motion";
import Card from "../components/ui/Card";
import SectionHeading from "../components/ui/SectionHeading";
import { Reveal, Stagger, StaggerItem } from "../components/ui/Reveal";
import { OrbitDivider } from "../components/space/Orbit";
import Button from "../components/ui/Button";
import { usePrefersReducedMotion } from "../lib/hooks";
import metrics from "../data/metrics.json";

const TRANSIT_SECONDS = 6;

/** A planet crossing its star, with the brightness curve drawn underneath in sync. */
function TransitDiagram() {
  const reducedMotion = usePrefersReducedMotion();
  const loop = reducedMotion ? undefined : { duration: TRANSIT_SECONDS, repeat: Infinity, ease: "linear" as const };
  // Light curve: flat, ingress, flat bottom, egress, flat
  const curve = "M0 30 H120 C135 30 138 70 152 70 H248 C262 70 265 30 280 30 H400";
  return (
    <figure className="w-full">
      <svg viewBox="0 0 400 230" className="w-full" role="img" aria-label="Diagram: as a planet passes in front of its star, the measured brightness dips and then recovers">
        <defs>
          <radialGradient id="star-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE2A8" />
            <stop offset="60%" stopColor="#FFB547" />
            <stop offset="100%" stopColor="#C9821A" />
          </radialGradient>
        </defs>
        {/* Star */}
        <circle cx="200" cy="70" r="52" fill="url(#star-glow)" opacity="0.95" />
        <circle cx="200" cy="70" r="64" fill="none" stroke="rgba(255,181,71,0.2)" strokeWidth="8" />
        {/* Planet crossing */}
        <motion.circle
          cy="74"
          r="11"
          fill="#05060A"
          stroke="#4FD1FF"
          strokeWidth="1.5"
          initial={{ cx: 60 }}
          animate={reducedMotion ? { cx: 200 } : { cx: [60, 340] }}
          transition={loop}
        />
        {/* Light curve */}
        <g transform="translate(0,140)">
          <text x="0" y="12" fill="#7A8299" fontSize="10" fontFamily="monospace">BRIGHTNESS</text>
          <path d={curve} fill="none" stroke="rgba(232,236,246,0.15)" strokeWidth="2" />
          <motion.path
            d={curve}
            fill="none"
            stroke="#4FD1FF"
            strokeWidth="2"
            initial={{ pathLength: reducedMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={loop}
          />
          <text x="200" y="88" textAnchor="middle" fill="#A3ABC2" fontSize="10" fontFamily="monospace">depth ≈ (R_planet / R_star)²</text>
        </g>
      </svg>
      <figcaption className="mt-2 text-center text-xs text-ink-faint">Illustration, not real Kepler data.</figcaption>
    </figure>
  );
}

const STEPS = [
  ["Split first", "70 / 15 / 15 train, validation and test, stratified by class, before looking at anything."],
  ["Explore", "Class balance, skewed ranges, missing values and outliers, on training rows only."],
  ["Engineer", "Log10 transforms and five physics features; a fixed rule picked the 16-feature list."],
  ["Train & tune", "Nine models, regularization curves, GridSearchCV with stratified 5-fold CV."],
  ["Ensemble", "Random Forest (bagging), Gradient Boosting (boosting) and a five-network seed ensemble."],
  ["Choose, then test", "Best validation AUC; within 0.002 the simplest wins. Test set opened once."],
];

const STACK = [
  ["Model", "Python 3.12 · scikit-learn · TensorFlow/Keras · pandas · NumPy · joblib"],
  ["API", "Python standard library HTTP server serving the saved pipeline"],
  ["Interface", "React · TypeScript · Vite · Tailwind CSS · react-three-fiber · Framer Motion · Recharts"],
];

export default function About() {
  return (
    <div className="container-page py-12 sm:py-16">
      <SectionHeading as="h1" eyebrow="About the mission" title="A first filter for Kepler's planet hunt.">
        ExoVet is a course project for Machine Learning (CSE2032) at BML Munjal University. It asks a simple question: how far
        can twelve basic measurements and standard machine learning go in separating real planet candidates from false alarms?
      </SectionHeading>

      <div className="mt-12 grid items-center gap-8 lg:grid-cols-2">
        <Reveal>
          <Card padding="lg">
            <TransitDiagram />
          </Card>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="eyebrow">The transit method</p>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Planets give themselves away by blocking light.</h2>
          <div className="mt-4 space-y-3 text-ink-muted">
            <p>
              When a planet passes in front of its star, the star looks slightly dimmer for a few hours. Kepler measured the
              brightness of ~150,000 stars almost non-stop and flagged every repeating dip as a <span className="text-ink">Kepler Object of Interest</span>.
            </p>
            <p>
              The depth, duration and period of the dip, together with the star's size and temperature, are what ExoVet reads.
              It does not process raw light curves — those numbers are already fitted by NASA's pipeline.
            </p>
          </div>
        </Reveal>
      </div>

      <OrbitDivider className="my-16" />

      <SectionHeading eyebrow="Method" title="Six steps, one fair exam." />
      <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map(([title, body], i) => (
          <StaggerItem key={title}>
            <div className="h-full rounded-lg border border-line bg-space-900/60 p-5">
              <span className="font-mono text-xs text-cyan">STEP {String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <Card glass={false} padding="lg" className="h-full">
            <p className="eyebrow">Dataset</p>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["Source", "NASA Kepler cumulative KOI table (Kaggle)"],
                ["Rows", Object.values(metrics.classBalance).reduce((s, p) => s + p.candidate + p.falsePositive, 0).toLocaleString("en-US")],
                ["Inputs", "12 measurements → 16 model features"],
                ["Target", "koi_pdisposition: CANDIDATE (1) or FALSE POSITIVE (0)"],
                ["Removed", "NASA's disposition, score and false-positive flags (they leak the answer)"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[96px_1fr] gap-3 border-b border-line pb-3 last:border-0">
                  <dt className="font-mono text-xs uppercase tracking-wider text-ink-faint">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </Reveal>
        <Reveal delay={0.05}>
          <Card glass={false} padding="lg" className="h-full">
            <p className="eyebrow">Built with</p>
            <dl className="mt-4 space-y-3 text-sm">
              {STACK.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[96px_1fr] gap-3 border-b border-line pb-3 last:border-0">
                  <dt className="font-mono text-xs uppercase tracking-wider text-ink-faint">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm text-ink-muted">
              Limitations: the label reflects NASA's vetting rather than confirmed planets, inputs are fitted values rather than
              light curves, and all scores come from one random split.
            </p>
          </Card>
        </Reveal>
      </div>

      <Reveal className="mt-16 flex flex-wrap justify-center gap-3">
        <Button to="/predict">Try the classifier</Button>
        <Button to="/results" variant="secondary">See the results</Button>
      </Reveal>
    </div>
  );
}
