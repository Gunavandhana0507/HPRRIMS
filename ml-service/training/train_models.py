"""Train both models on synthetic data and write them to the model directory.

Usage:  python -m training.train_models
"""
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from training.synthetic_data import (
    ICU_CLASSES,
    ICU_FEATURES,
    READMISSION_FEATURES,
    generate_icu_data,
    generate_readmission_data,
)

READMISSION_VERSION = "readmission-logreg-1.0.0"
ICU_VERSION = "icu-priority-rf-1.0.0"


def model_dir() -> Path:
    path = Path(os.getenv("ML_MODEL_DIR", Path(__file__).resolve().parent.parent / "models"))
    path.mkdir(parents=True, exist_ok=True)
    return path


def train_readmission(out: Path) -> dict:
    df = generate_readmission_data()
    X, y = df[READMISSION_FEATURES], df["readmitted_30d"]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=1, stratify=y)
    pipe = Pipeline(
        [("scaler", StandardScaler()), ("clf", LogisticRegression(max_iter=1000, class_weight="balanced"))]
    )
    pipe.fit(X_tr, y_tr)
    proba = pipe.predict_proba(X_te)[:, 1]
    metrics = {
        "roc_auc": round(float(roc_auc_score(y_te, proba)), 4),
        "accuracy": round(float(accuracy_score(y_te, proba >= 0.5)), 4),
        "positive_rate_train": round(float(y_tr.mean()), 4),
    }
    joblib.dump(pipe, out / "readmission_model.joblib")
    return {
        "version": READMISSION_VERSION,
        "algorithm": "LogisticRegression (StandardScaler, class_weight=balanced)",
        "features": READMISSION_FEATURES,
        "training_rows": int(len(X_tr)),
        "metrics": metrics,
    }


def train_icu(out: Path) -> dict:
    df = generate_icu_data()
    X, y = df[ICU_FEATURES], df["priority"]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=1, stratify=y)
    clf = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=3, class_weight="balanced")
    clf.fit(X_tr, y_tr)
    pred = clf.predict(X_te)
    metrics = {
        "accuracy": round(float(accuracy_score(y_te, pred)), 4),
        "macro_f1": round(float(f1_score(y_te, pred, average="macro")), 4),
    }
    joblib.dump(clf, out / "icu_priority_model.joblib")
    return {
        "version": ICU_VERSION,
        "algorithm": "RandomForestClassifier (200 trees, max_depth=10)",
        "features": ICU_FEATURES,
        "classes": ICU_CLASSES,
        "training_rows": int(len(X_tr)),
        "metrics": metrics,
    }


def train_all() -> dict:
    out = model_dir()
    meta = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "data": "synthetic (training/synthetic_data.py)",
        "readmission": train_readmission(out),
        "icu_priority": train_icu(out),
    }
    (out / "metadata.json").write_text(json.dumps(meta, indent=2))
    return meta


if __name__ == "__main__":
    print(json.dumps(train_all(), indent=2))
