"""Export the saved MLP's weights to a small .npz so the API can run it with numpy alone.

Why: the deployed container then needs no TensorFlow/Keras (about 1 GB less). The network is three Dense layers
(17 -> 128 -> 64 -> 1) with ReLU and a sigmoid output. Dropout only acts during training, so it is not needed here.

Run once from the project folder, with the environment that has keras (the project's .venv):
    .venv\\Scripts\\python api\\export_mlp_weights.py

It writes models/exovet_network_weights.npz and checks that numpy reproduces keras' probabilities on the test file.
"""

import os
import sys

import joblib
import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.environ.setdefault("KERAS_BACKEND", "tensorflow")
import keras  # noqa: E402

KERAS_FILE = os.path.join(ROOT, "models", "exovet_network_0.keras")
PREP_FILE = os.path.join(ROOT, "models", "exovet_network_preparation.joblib")
OUT_FILE = os.path.join(ROOT, "models", "exovet_network_weights.npz")

network = keras.models.load_model(KERAS_FILE)
dense = [layer for layer in network.layers if layer.__class__.__name__ == "Dense"]
assert len(dense) == 3, f"expected 3 Dense layers, found {len(dense)}"
arrays = {}
for i, layer in enumerate(dense, 1):
    kernel, bias = layer.get_weights()
    arrays[f"w{i}"] = kernel.astype(np.float64)
    arrays[f"b{i}"] = bias.astype(np.float64)
np.savez(OUT_FILE, **arrays)
print("wrote", OUT_FILE, {k: v.shape for k, v in arrays.items()})


def forward(x, w):
    h = np.maximum(x @ w["w1"] + w["b1"], 0)
    h = np.maximum(h @ w["w2"] + w["b2"], 0)
    return (1 / (1 + np.exp(-(h @ w["w3"] + w["b3"])))).ravel()


# Check against keras on real test rows
preparation = joblib.load(PREP_FILE)
test = pd.read_csv(os.path.join(ROOT, "data", "processed", "test.csv"))
prepared = preparation.transform(test).astype("float32")
expected = network.predict(prepared, verbose=0).ravel()
actual = forward(prepared.astype(np.float64), np.load(OUT_FILE))
worst = float(np.abs(expected - actual).max())
print(f"largest difference from keras on {len(test)} test rows: {worst:.2e}")
assert worst < 1e-5, "numpy forward pass does not match keras"
print("OK")
