# ExoVet web app

A "Deep Space Observatory" interface for the ExoVet classifier: a landing page with a real-time 3D planet, a
prediction console, a results dashboard and an about page. The React app talks to a small Python API that serves the
saved KNN model from `models/final/`.

```
Exovet/
├── api/
│   ├── server.py            # prediction API (Python standard library only)
│   └── export_metrics.py    # writes web/src/data/metrics.json for the Results page
└── web/
    └── src/
        ├── design/tokens.ts # ← every colour, font, radius, shadow and motion value
        ├── components/space # Starfield, PlanetHero/PlanetScene/PlanetLite, Orbit (divider + loader)
        ├── components/ui    # Button, Card, StatTile, Gauge, Reveal, SectionHeading, CursorGlow, chartTheme
        ├── components/layout# Navbar, Footer, PageTransition ("warp")
        ├── pages            # Landing, Predict, Results, About, NotFound
        ├── lib              # API client, field definitions, hooks
        └── data/metrics.json
```

## Setup

You need Node 18+ and the project's Python virtual environment (`.venv`, see the main README).

```bash
# 1. Install the web dependencies (once)
cd web
npm install

# 2. Start the API, from the project folder (port 8000)
cd ..
.venv\Scripts\python api\server.py

# 3. In a second terminal, start the web app (port 5173)
cd web
npm run dev
```

Open http://localhost:5173. In development Vite forwards every `/api/...` request to port 8000.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check, then build to `web/dist/` |
| `npm run preview` | Serve the production build on port 4173 (still proxies `/api`) |
| `npm run typecheck` | TypeScript check only |

If the API is on another address, set `EXOVET_API=http://host:port` before `npm run dev`. For a deployed build that
calls a different origin, set `VITE_API_BASE=https://your-api` before `npm run build`.

**After retraining the model**, re-run the notebook, then refresh the dashboard numbers:

```bash
.venv\Scripts\python api\export_metrics.py
```

## API

| Endpoint | Returns |
|---|---|
| `GET /api/health` | Model name, k and training-row count |
| `GET /api/sample?label=1` | A random KOI from the test file (`label=1` candidate, `0` false positive, omit for any) |
| `POST /api/predict` | Body `{"rows": [{...12 measurements...}]}`, up to 500 rows. For each row: label, score, the 11 neighbours that voted, derived physics features and each input's percentile in the training data |

Empty values are allowed (the pipeline fills them with the training median). Text or infinite values return a 400 with
a readable message.

## Swapping colours and fonts

Everything visual comes from **`src/design/tokens.ts`**. Tailwind (`tailwind.config.ts`), the CSS and the Three.js scene
all import from it, so one edit restyles the whole app.

**Colours.** Change the hex values in `colors`:

```ts
cyan:  { DEFAULT: "#4FD1FF", soft: "#9BE5FF", deep: "#1A8FC0" },  // primary accent, CANDIDATE
amber: { DEFAULT: "#FFB547", soft: "#FFD18A", deep: "#C9821A" },  // secondary accent, FALSE POSITIVE
```

The Tailwind class names (`text-cyan`, `bg-amber/10` …) stay the same, so no component needs editing. The planet's
surface colours are in `scene.planet`. A few SVG illustrations (`Orbit.tsx`, `About.tsx`, `PlanetLite.tsx`) use the
same hex values inline; search for the old hex to update them too. Keep body text (`ink`) at 4.5:1 contrast or more
against `space.950`.

**Fonts.** Fonts are self-hosted with Fontsource (no Google Fonts request):

1. `npm install @fontsource-variable/<font-name>`
2. Import it in `src/main.tsx` (replace the old import)
3. Put its family name first in `fonts.display`, `fonts.body` or `fonts.mono` in `tokens.ts`

**Motion.** Durations, easing, reveal distance, magnetic strength, planet rotation speed, tilt strength and starfield
density are all in `tokens.ts` (`motion`, `scene`, `starfield`).

## Behaviour notes

* **Reduced motion** (`prefers-reduced-motion: reduce`): the planet renders as a still frame (no rotation or tilt), the
  starfield draws one static frame with no twinkle, parallax or shooting stars, page transitions become a plain fade
  and the cursor glow is off.
* **Phones** (< 768 px) get a CSS-only planet instead of WebGL. Touch devices get no cursor glow or magnetic buttons.
* **Performance:** three.js (≈220 KB gzipped) and Recharts load only on the pages that use them. The 3D canvas caps the
  pixel ratio at 2, lowers it when frames drop (drei `PerformanceMonitor` + `AdaptiveDpr`), and stops rendering when the
  tab is hidden or the hero scrolls off screen. The starfield also pauses on hidden tabs.
* **Accessibility:** skip link, themed focus rings, keyboard-operable tabs and menus, `aria-live` result panel, a
  `role="meter"` gauge, and text labels on every canvas and chart.
