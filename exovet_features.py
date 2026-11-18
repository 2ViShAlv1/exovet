"""Feature derivation for ExoVet, shared by Notebook B and the saved model.

Why this is in its own file: a saved model stores only a *reference* to this code. If the class were defined inside a
notebook, the saved model could not be loaded anywhere else. Notebook B (Section 2) explains every step and checks that
this file gives the same numbers.

Every step here uses only values from the same row plus fixed physical constants. Nothing is learned from the data, so
nothing can leak from one row to another.
"""

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

# The 12 measurements in train.csv, val.csv and test.csv
RAW_FEATURES = [
    "koi_period", "koi_duration", "koi_depth", "koi_impact", "koi_model_snr", "koi_prad",
    "koi_teq", "koi_insol", "koi_steff", "koi_slogg", "koi_srad", "koi_kepmag",
]

# Physical limits and constants
IMPACT_CAP = 1.5                   # above about 1.3 the object misses the star's disc, so larger values are failed fits
SUN_RADIUS_IN_EARTH_RADII = 109.1  # the Sun is 109.1 Earths wide, which puts both radii into the same unit
KEPLER_BASELINE_DAYS = 1470        # Kepler's primary mission lasted about 1,470 days
SUN_LOG_G = 4.438                  # surface gravity of the Sun (log scale)

# Columns kept on their normal scale, and columns replaced by their log10
KEPT_FEATURES = ["koi_impact", "koi_teq", "koi_steff", "koi_slogg", "koi_kepmag"]
LOG_FEATURES = ["koi_period", "koi_duration", "koi_depth", "koi_prad", "koi_insol", "koi_model_snr", "koi_srad"]

# The two derived features named in the project brief
BRIEF_DERIVED = ["log_transit_depth_per_hour", "log_planet_star_radius_ratio"]

# Three more physics checks carried over from the earlier ExoVet notebook, tested again in Section 2
EXTRA_DERIVED = ["log_snr_per_transit", "log_duration_ratio", "depth_consistency"]

# Every feature this file can build, in a fixed order
ALL_FEATURES = KEPT_FEATURES + ["log_" + name for name in LOG_FEATURES] + BRIEF_DERIVED + EXTRA_DERIVED


def build_features(table):
    """Turn the 12 raw measurements into the full table of features. Gaps stay as NaN for the imputer to fill later."""
    raw = table[RAW_FEATURES].astype(float).copy()

    # A transit cannot have zero depth or zero signal, and a planet cannot receive zero light: these are failed
    # measurements, so we treat them as missing. This also makes the log transform safe.
    for column in ["koi_depth", "koi_model_snr", "koi_insol"]:
        raw[column] = raw[column].where(raw[column] != 0)

    # Very large impact values are failed fits. Capping keeps their "extreme" meaning without stretching the scale.
    raw["koi_impact"] = raw["koi_impact"].clip(upper=IMPACT_CAP)

    features = pd.DataFrame(index=raw.index)

    for column in KEPT_FEATURES:
        features[column] = raw[column]

    for column in LOG_FEATURES:
        features["log_" + column] = np.log10(raw[column])

    # How fast light is lost during the event: binary stars give deep, short eclipses
    features["log_transit_depth_per_hour"] = np.log10(raw["koi_depth"] / raw["koi_duration"])

    # A planet is much smaller than its star. A ratio near or above about 0.3 suggests the "planet" is really a star.
    radius_ratio = raw["koi_prad"] / (raw["koi_srad"] * SUN_RADIUS_IN_EARTH_RADII)
    features["log_planet_star_radius_ratio"] = np.log10(radius_ratio)

    # Signal strength of one single event, because total signal grows with the number of transits observed
    number_of_transits = KEPLER_BASELINE_DAYS / raw["koi_period"]
    features["log_snr_per_transit"] = np.log10(raw["koi_model_snr"] / np.sqrt(number_of_transits))

    # Observed duration compared with what Kepler's laws predict for a planet around this star
    stellar_density = (10 ** (raw["koi_slogg"] - SUN_LOG_G)) / raw["koi_srad"]
    expected_duration = 13.0 * (raw["koi_period"] / 365.25) ** (1 / 3) * stellar_density ** (-1 / 3)
    features["log_duration_ratio"] = np.log10(raw["koi_duration"] / expected_duration)

    # Observed depth compared with (planet radius / star radius) squared. This is about 1 for a full planetary transit.
    features["depth_consistency"] = (raw["koi_depth"] / 1e6) / (radius_ratio ** 2)

    # Any division by zero becomes a gap, which the imputer fills later
    features = features.replace([np.inf, -np.inf], np.nan)
    return features[ALL_FEATURES]


class KOIFeatureBuilder(BaseEstimator, TransformerMixin):
    """The same steps as build_features, packaged so they can be the first step of a scikit-learn Pipeline."""

    def __init__(self, feature_names=None):
        # feature_names = the columns to keep. None keeps all of them.
        self.feature_names = feature_names

    def fit(self, X, y=None):
        # Nothing is learned from the data, so fitting does nothing
        return self

    def transform(self, X):
        features = build_features(X)
        if self.feature_names is None:
            return features
        return features[list(self.feature_names)]

    def get_feature_names_out(self, input_features=None):
        if self.feature_names is None:
            return np.array(ALL_FEATURES, dtype=object)
        return np.array(self.feature_names, dtype=object)
