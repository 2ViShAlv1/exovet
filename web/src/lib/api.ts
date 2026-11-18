/** Typed client for the ExoVet API (api/server.py). In development Vite proxies /api to port 8000. */

import type { FieldKey } from "./fields";

export type ClassLabel = "CANDIDATE" | "FALSE POSITIVE";

export type ModelKey = "mlp" | "knn";

export const MODEL_OPTIONS: { key: ModelKey; label: string; blurb: string }[] = [
  { key: "mlp", label: "Neural network", blurb: "MLP, 128 and 64 units. Honest score on real KOIs: test AUC 0.91." },
  { key: "knn", label: "Nearest neighbours", blurb: "KNN, k = 11. Shows the 11 similar signals that voted." },
];

export interface Prediction {
  model: ModelKey;
  label: ClassLabel;
  score: number; // 0..1, probability of CANDIDATE
  neighbours: { label: ClassLabel; distance: number }[]; // empty for the MLP
  neighbourVotes: { candidate: number; falsePositive: number } | null; // null for the MLP
  missing: FieldKey[];
  percentiles: Record<FieldKey, number | null>;
  derived: Record<string, { value: number | null; hint: string }>;
}

export interface Sample {
  values: Record<FieldKey, number | null>;
  trueLabel: ClassLabel;
}

const BASE = import.meta.env.VITE_API_BASE ?? "";
const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(
    message: string,
    public kind: "offline" | "bad-request" | "server",
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, signal: controller.signal });
  } catch {
    throw new ApiError("Can't reach the ExoVet API. Is the server running?", "offline");
  } finally {
    window.clearTimeout(timer);
  }
  // The Vite proxy answers 502/504 when the Python server is down
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new ApiError("Can't reach the ExoVet API. Is the server running?", "offline");
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("The API sent a response that isn't JSON.", "server");
  }
  if (!response.ok) {
    const message = (body as { error?: string })?.error ?? `Request failed (${response.status}).`;
    throw new ApiError(message, response.status < 500 ? "bad-request" : "server");
  }
  return body as T;
}

export const api = {
  health: () =>
    request<{ status: string; defaultModel: ModelKey; models: { key: ModelKey; name: string; trainingRows: number }[] }>("/api/health"),
  sample: (model: ModelKey, label?: 0 | 1) =>
    request<Sample>(`/api/sample?model=${model}${label === undefined ? "" : `&label=${label}`}`),
  predict: (rows: Partial<Record<FieldKey, number | null>>[], model: ModelKey) =>
    request<{ results: Prediction[] }>("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, model }),
    }),
};
