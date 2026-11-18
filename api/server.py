"""ExoVet prediction API: a small JSON server that serves two saved models and the built web app.

Run from the project folder with the project's virtual environment:
    .venv\\Scripts\\python api\\server.py            (listens on http://127.0.0.1:8000)

Models (choose one per request with "model": "mlp" or "knn"; the default is "mlp")
  mlp  Neural network (128-64, dropout 0.3), trained on the real + generated training split. Run with numpy only.
  knn  K-nearest neighbours (k = 11), trained on the merged dataset. Also returns the neighbours that voted.

Endpoints
  GET  /api/health                  -> status and details of both models
  GET  /api/fields?model=           -> the 12 inputs with their training-data ranges
  GET  /api/sample?label=1|0&model= -> one random KOI from that model's test file (label optional)
  POST /api/predict  {"model": "mlp", "rows": [{...12 measurements...}, ...]}   (up to 500 rows)
       -> for each row: label, score, derived features and input percentiles (KNN adds the 11 voting neighbours)

Any other GET path is served from web/dist (the built React app), so one process serves the whole site.

Environment: EXOVET_HOST (default 127.0.0.1), EXOVET_PORT (default 8000), EXOVET_CORS_ORIGIN (default: none, same origin).
"""

import json
import math
import mimetypes
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

import joblib
import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)  # the saved pipelines need exovet_features.py
from exovet_features import RAW_FEATURES, build_features  # noqa: E402

HOST = os.environ.get("EXOVET_HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT") or os.environ.get("EXOVET_PORT", "8000"))  # hosts like Render set PORT
CORS_ORIGIN = os.environ.get("EXOVET_CORS_ORIGIN", "")
WEB_DIST = os.path.join(ROOT, "web", "dist")
MAX_ROWS = 500
TARGET = "koi_pdisposition"
LABELS = {1: "CANDIDATE", 0: "FALSE POSITIVE"}
DEFAULT_MODEL = "mlp"

# Derived features shown in the UI, with a plain-English hint for each
DERIVED_SHOWN = {
    "log_planet_star_radius_ratio": "Planet radius ÷ star radius (log10). Near or above −0.5 suggests a star, not a planet.",
    "depth_consistency": "Observed depth ÷ (radius ratio)². About 1 for a real planetary transit.",
    "log_duration_ratio": "Observed duration ÷ duration expected from Kepler's laws (log10). Near 0 is normal.",
    "log_transit_depth_per_hour": "How fast light is lost during the dip (log10 ppm per hour).",
    "log_snr_per_transit": "Signal strength of a single transit (log10).",
}

_lock = threading.Lock()      # scikit-learn objects are used from one thread at a time


def path(*parts):
    return os.path.join(ROOT, *parts)


class Reference:
    """The training and test rows behind one model: percentiles for the UI and random examples from the test file."""

    def __init__(self, folder):
        self.train = pd.read_csv(path("data", folder, "train.csv"))
        self.test = pd.read_csv(path("data", folder, "test.csv"))
        self.train_labels = self.train[TARGET].to_numpy()
        self.sorted_raw = {c: np.sort(self.train[c].dropna().to_numpy()) for c in RAW_FEATURES}
        self.stats = {
            c: {"min": float(v[0]), "median": float(np.median(v)), "max": float(v[-1]),
                "p01": float(np.percentile(v, 1)), "p99": float(np.percentile(v, 99))}
            for c, v in self.sorted_raw.items()
        }

    def percentile_of(self, column, value):
        if value is None:
            return None
        data = self.sorted_raw[column]
        return round(100.0 * np.searchsorted(data, value, side="right") / len(data), 1)


class MlpModel:
    """The neural network, run with numpy: the three Dense layers saved by api/export_mlp_weights.py."""

    key = "mlp"
    name = "MLP"

    def __init__(self):
        self.prepare = joblib.load(path("models", "exovet_network_preparation.joblib"))
        self.weights = dict(np.load(path("models", "exovet_network_weights.npz")))
        self.reference = Reference("processed")

    def scores(self, table):
        with _lock:
            x = self.prepare.transform(table).astype("float64")
        w = self.weights
        h = np.maximum(x @ w["w1"] + w["b1"], 0)
        h = np.maximum(h @ w["w2"] + w["b2"], 0)
        return (1.0 / (1.0 + np.exp(-(h @ w["w3"] + w["b3"])))).ravel(), None

    def info(self):
        return {"key": self.key, "name": self.name, "layers": [128, 64], "trainingRows": len(self.reference.train),
                "neighbours": False}


class KnnModel:
    """K-nearest neighbours: a scikit-learn pipeline whose last step is the KNN classifier."""

    key = "knn"
    name = "KNN"

    def __init__(self):
        self.model = joblib.load(path("models", "final", "exovet_final_model.joblib"))
        self.prepare = self.model[:-1]          # features -> imputer -> scaler
        self.knn = self.model.named_steps["model"]
        self.reference = Reference("final")

    def scores(self, table):
        with _lock:
            scores = self.model.predict_proba(table)[:, 1]
            distances, indices = self.knn.kneighbors(self.prepare.transform(table))
        return scores, (distances, indices)

    def info(self):
        return {"key": self.key, "name": self.name, "k": self.knn.n_neighbors, "trainingRows": len(self.reference.train),
                "neighbours": True}


print("Loading models and data…", flush=True)
MODELS = {m.key: m for m in (MlpModel(), KnnModel())}
for m in MODELS.values():
    print(f"  {m.name}: {len(m.reference.train):,} training rows", flush=True)
print(f"Ready. Default model: {MODELS[DEFAULT_MODEL].name}. Web app: {'yes' if os.path.isdir(WEB_DIST) else 'no (web/dist missing)'}",
      flush=True)


def get_model(key):
    key = (key or DEFAULT_MODEL).lower()
    if key not in MODELS:
        raise ValueError(f"Unknown model {key!r}. Choose one of: {', '.join(MODELS)}.")
    return MODELS[key]


def clean(value):
    """JSON cannot hold NaN or infinity, so they become null."""
    if value is None:
        return None
    value = float(value)
    return None if (math.isnan(value) or math.isinf(value)) else value


def parse_rows(rows):
    """Validate the incoming rows. Missing values are allowed (the model fills them), text is not."""
    if not isinstance(rows, list) or not rows:
        raise ValueError("Send a non-empty list called 'rows'.")
    if len(rows) > MAX_ROWS:
        raise ValueError(f"Send at most {MAX_ROWS} rows at a time.")
    records = []
    for i, row in enumerate(rows, 1):
        if not isinstance(row, dict):
            raise ValueError(f"Row {i} is not an object.")
        record = {}
        for column in RAW_FEATURES:
            value = row.get(column)
            if value in (None, ""):
                record[column] = np.nan
                continue
            try:
                record[column] = float(value)
            except (TypeError, ValueError):
                raise ValueError(f"Row {i}: '{column}' must be a number, got {value!r}.")
            if math.isinf(record[column]) or math.isnan(record[column]):
                raise ValueError(f"Row {i}: '{column}' must be finite.")
        if all(math.isnan(v) for v in record.values()):
            raise ValueError(f"Row {i} has no measurements.")
        records.append(record)
    return pd.DataFrame(records, columns=RAW_FEATURES)


def predict(model, rows):
    table = parse_rows(rows)
    scores, neighbour_data = model.scores(table)
    derived = build_features(table)
    reference = model.reference
    results = []
    for i in range(len(table)):
        result = {
            "model": model.key,
            "label": LABELS[int(scores[i] >= 0.5)],
            "score": round(float(scores[i]), 4),
            "neighbours": [],
            "neighbourVotes": None,
            "missing": [c for c in RAW_FEATURES if math.isnan(table.iloc[i][c])],
            "percentiles": {c: reference.percentile_of(c, clean(table.iloc[i][c])) for c in RAW_FEATURES},
            "derived": {k: {"value": clean(derived.iloc[i][k]), "hint": hint} for k, hint in DERIVED_SHOWN.items()},
        }
        if neighbour_data is not None:
            distances, indices = neighbour_data
            labels = reference.train_labels[indices[i]]
            result["neighbours"] = [{"label": LABELS[int(lbl)], "distance": round(float(d), 4)}
                                    for lbl, d in zip(labels, distances[i])]
            result["neighbourVotes"] = {"candidate": int(labels.sum()), "falsePositive": int(len(labels) - labels.sum())}
        results.append(result)
    return results


def sample(model, label):
    test = model.reference.test
    pool = test if label is None else test[test[TARGET] == label]
    row = pool.sample(1).iloc[0]
    return {"values": {c: clean(row[c]) for c in RAW_FEATURES}, "trueLabel": LABELS[int(row[TARGET])], "model": model.key}


class Handler(BaseHTTPRequestHandler):
    server_version = "ExoVetAPI/2.0"

    def _headers(self):
        if CORS_ORIGIN:
            self.send_header("Access-Control-Allow-Origin", CORS_ORIGIN)
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("X-Content-Type-Options", "nosniff")

    def _send(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._headers()
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, file_path):
        with open(file_path, "rb") as handle:
            body = handle.read()
        content_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type + ("; charset=utf-8" if content_type.startswith("text/") else ""))
        self.send_header("Content-Length", str(len(body)))
        # Vite names built assets by content hash, so they can be cached for good; index.html must always be fresh
        immutable = os.sep + "assets" + os.sep in file_path
        self.send_header("Cache-Control", "public, max-age=31536000, immutable" if immutable else "no-cache")
        self._headers()
        self.end_headers()
        self.wfile.write(body)

    def _serve_web(self, url_path):
        """Serve web/dist. Unknown paths get index.html, so React Router can handle /predict, /results, …"""
        if not os.path.isdir(WEB_DIST):
            return self._send(404, {"error": "Web app not built. Run `npm run build` in web/."})
        relative = unquote(url_path).lstrip("/") or "index.html"
        candidate = os.path.realpath(os.path.join(WEB_DIST, relative))
        inside = candidate == os.path.realpath(WEB_DIST) or candidate.startswith(os.path.realpath(WEB_DIST) + os.sep)
        if not inside:  # blocks ../ tricks
            return self._send(404, {"error": "Not found"})
        if not os.path.isfile(candidate):
            if os.path.splitext(relative)[1]:  # a missing .js/.css/.png is a real 404, not a page
                return self._send(404, {"error": "Not found"})
            candidate = os.path.join(WEB_DIST, "index.html")
        return self._send_file(candidate)

    def do_OPTIONS(self):  # CORS pre-flight
        self.send_response(204)
        self._headers()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        url = urlparse(self.path)
        query = parse_qs(url.query)
        try:
            if url.path == "/api/health":
                return self._send(200, {"status": "ok", "defaultModel": DEFAULT_MODEL,
                                        "models": [m.info() for m in MODELS.values()]})
            if url.path == "/api/fields":
                model = get_model(query.get("model", [None])[0])
                return self._send(200, {"fields": RAW_FEATURES, "stats": model.reference.stats})
            if url.path == "/api/sample":
                model = get_model(query.get("model", [None])[0])
                raw = query.get("label", [None])[0]
                return self._send(200, sample(model, int(raw) if raw in ("0", "1") else None))
        except ValueError as error:
            return self._send(400, {"error": str(error)})
        if url.path.startswith("/api/"):
            return self._send(404, {"error": "Not found"})
        return self._serve_web(url.path)

    def do_POST(self):
        if urlparse(self.path).path != "/api/predict":
            return self._send(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 2_000_000:
                return self._send(413, {"error": "Request too large."})
            payload = json.loads(self.rfile.read(length) or b"{}")
            model = get_model(payload.get("model"))
            return self._send(200, {"model": model.key, "results": predict(model, payload.get("rows"))})
        except ValueError as error:
            return self._send(400, {"error": str(error)})
        except Exception as error:  # keep the server alive and tell the UI what happened
            return self._send(500, {"error": f"Prediction failed: {error}"})

    def log_message(self, fmt, *args):
        sys.stdout.write(f"{self.address_string()} {fmt % args}\n")


if __name__ == "__main__":
    print(f"ExoVet API on http://{HOST}:{PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
