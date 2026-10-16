"""Synthetic training data generators.

All data produced here is synthetic. It is generated from hand-specified
relationships so that the models learn plausible directions of effect for an
academic demonstration. It is not derived from real patients and the trained
models must not be used for clinical decisions.
"""
import numpy as np
import pandas as pd

READMISSION_FEATURES = [
    "age",
    "is_male",
    "length_of_stay_days",
    "prior_admissions_12m",
    "prior_readmissions",
    "medical_record_count",
    "had_icu_stay",
    "is_readmission",
    "days_since_previous_discharge",
]

ICU_FEATURES = [
    "age",
    "heart_rate",
    "systolic_bp",
    "respiratory_rate",
    "spo2",
    "temperature",
    "gcs",
    "requires_ventilation",
    "comorbidity_count",
]

ICU_CLASSES = ["LOW", "MODERATE", "HIGH", "CRITICAL"]


def generate_readmission_data(n: int = 6000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    age = rng.integers(18, 95, n)
    is_male = rng.integers(0, 2, n)
    los = np.clip(rng.gamma(2.0, 2.5, n).round(), 1, 45)
    prior_adm = rng.poisson(0.8 + (age > 65) * 0.7, n).clip(0, 10)
    prior_readm = np.minimum(prior_adm, rng.poisson(0.3 + prior_adm * 0.15, n))
    records = np.clip((los * rng.uniform(0.8, 2.2, n)).round(), 1, 80)
    icu = rng.binomial(1, 0.08 + (age > 70) * 0.07, n)
    is_readm = rng.binomial(1, 0.08 + prior_readm.clip(0, 3) * 0.08, n)
    has_prev = prior_adm > 0
    days_since = np.where(has_prev, rng.integers(5, 365, n), 365)
    days_since = np.where(is_readm == 1, rng.integers(1, 30, n), days_since)

    logit = (
        -3.4
        + 0.028 * (age - 55)
        + 0.10 * los
        + 0.38 * prior_adm
        + 0.55 * prior_readm
        + 0.020 * records
        + 0.85 * icu
        + 0.70 * is_readm
        - 0.0035 * days_since
        + 0.10 * is_male
    )
    prob = 1 / (1 + np.exp(-logit))
    y = rng.binomial(1, prob)
    df = pd.DataFrame(
        {
            "age": age,
            "is_male": is_male,
            "length_of_stay_days": los,
            "prior_admissions_12m": prior_adm,
            "prior_readmissions": prior_readm,
            "medical_record_count": records,
            "had_icu_stay": icu,
            "is_readmission": is_readm,
            "days_since_previous_discharge": days_since,
        }
    )
    df["readmitted_30d"] = y
    return df


def _news_like_score(df: pd.DataFrame) -> np.ndarray:
    s = np.zeros(len(df))
    rr = df["respiratory_rate"].to_numpy()
    s += np.select([rr <= 8, rr <= 11, rr <= 20, rr <= 24], [3, 1, 0, 2], 3)
    spo2 = df["spo2"].to_numpy()
    s += np.select([spo2 <= 91, spo2 <= 93, spo2 <= 95], [3, 2, 1], 0)
    sbp = df["systolic_bp"].to_numpy()
    s += np.select([sbp <= 90, sbp <= 100, sbp <= 110, sbp <= 219], [3, 2, 1, 0], 3)
    hr = df["heart_rate"].to_numpy()
    s += np.select([hr <= 40, hr <= 50, hr <= 90, hr <= 110, hr <= 130], [3, 1, 0, 1, 2], 3)
    t = df["temperature"].to_numpy()
    s += np.select([t <= 35.0, t <= 36.0, t <= 38.0, t <= 39.0], [3, 1, 0, 1], 2)
    gcs = df["gcs"].to_numpy()
    s += np.select([gcs <= 8, gcs <= 12, gcs <= 14], [4, 3, 1], 0)
    s += df["requires_ventilation"].to_numpy() * 4
    s += np.minimum(df["comorbidity_count"].to_numpy(), 4) * 0.5
    s += (df["age"].to_numpy() >= 75) * 1.0
    return s


def generate_icu_data(n: int = 6000, seed: int = 7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    severity = rng.beta(2, 3, n)
    df = pd.DataFrame(
        {
            "age": rng.integers(18, 95, n),
            "heart_rate": np.clip(rng.normal(80 + severity * 50, 12), 30, 200).round(),
            "systolic_bp": np.clip(rng.normal(125 - severity * 45, 14), 50, 230).round(),
            "respiratory_rate": np.clip(rng.normal(15 + severity * 14, 3), 5, 50).round(),
            "spo2": np.clip(rng.normal(98 - severity * 12, 2), 60, 100).round(),
            "temperature": np.clip(rng.normal(37.0 + severity * 1.4, 0.5), 33.0, 42.0).round(1),
            "gcs": np.clip(np.round(15 - severity * rng.uniform(0, 10, n)), 3, 15),
            "requires_ventilation": rng.binomial(1, np.clip(severity**3, 0.01, 0.9)),
            "comorbidity_count": rng.poisson(1 + severity * 2, n).clip(0, 8),
        }
    )
    score = _news_like_score(df) + rng.normal(0, 1.0, n)
    df["priority"] = np.select(
        [score < 4, score < 8, score < 12], ICU_CLASSES[:3], ICU_CLASSES[3]
    )
    return df
