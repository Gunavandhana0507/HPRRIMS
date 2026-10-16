import json
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from training.synthetic_data import ICU_CLASSES, ICU_FEATURES, READMISSION_FEATURES
from training.train_models import train_all

FEATURE_LABELS = {
    "age": "Age",
    "is_male": "Sex (male)",
    "length_of_stay_days": "Length of stay",
    "prior_admissions_12m": "Admissions in last 12 months",
    "prior_readmissions": "Previous readmissions",
    "medical_record_count": "Clinical record entries",
    "had_icu_stay": "ICU stay during admission",
    "is_readmission": "Current admission is a readmission",
    "days_since_previous_discharge": "Days since previous discharge",
}

ICU_WEIGHTS = {"LOW": 10.0, "MODERATE": 40.0, "HIGH": 70.0, "CRITICAL": 100.0}

DISCLAIMER = (
    "Advisory output from a model trained on synthetic data. "
    "It does not replace clinical judgement."
)


class ModelStore:
    def __init__(self) -> None:
        self.dir = Path(os.getenv("ML_MODEL_DIR", Path(__file__).resolve().parent.parent / "models"))
        self.readmission = None
        self.icu = None
        self.metadata: dict = {}

    def load(self) -> None:
        r_path = self.dir / "readmission_model.joblib"
        i_path = self.dir / "icu_priority_model.joblib"
        m_path = self.dir / "metadata.json"
        if not (r_path.exists() and i_path.exists() and m_path.exists()):
            train_all()
        self.readmission = joblib.load(r_path)
        self.icu = joblib.load(i_path)
        self.metadata = json.loads(m_path.read_text())

    @property
    def ready(self) -> bool:
        return self.readmission is not None and self.icu is not None

    def predict_readmission(self, payload) -> dict:
        row = {
            "age": payload.age,
            "is_male": 1 if payload.gender == "MALE" else 0,
            "length_of_stay_days": payload.length_of_stay_days,
            "prior_admissions_12m": payload.prior_admissions_12m,
            "prior_readmissions": payload.prior_readmissions,
            "medical_record_count": payload.medical_record_count,
            "had_icu_stay": int(payload.had_icu_stay),
            "is_readmission": int(payload.is_readmission),
            "days_since_previous_discharge": (
                payload.days_since_previous_discharge
                if payload.days_since_previous_discharge is not None
                else 365
            ),
        }
        X = pd.DataFrame([row], columns=READMISSION_FEATURES)
        prob = float(self.readmission.predict_proba(X)[0, 1])
        scaler = self.readmission.named_steps["scaler"]
        coef = self.readmission.named_steps["clf"].coef_[0]
        scaled = scaler.transform(X)[0]
        contributions = coef * scaled
        order = np.argsort(-np.abs(contributions))[:4]
        factors = [
            {
                "feature": READMISSION_FEATURES[i],
                "label": FEATURE_LABELS[READMISSION_FEATURES[i]],
                "value": float(X.iloc[0, i]),
                "contribution": round(float(contributions[i]), 4),
            }
            for i in order
        ]
        level = "LOW" if prob < 0.35 else "MEDIUM" if prob < 0.65 else "HIGH"
        return {
            "probability": round(prob, 4),
            "risk_level": level,
            "model_version": self.metadata["readmission"]["version"],
            "top_factors": factors,
            "disclaimer": DISCLAIMER,
        }

    def predict_icu(self, payload) -> dict:
        X = pd.DataFrame([payload.model_dump()], columns=ICU_FEATURES)
        X["requires_ventilation"] = X["requires_ventilation"].astype(int)
        proba = self.icu.predict_proba(X)[0]
        probs = {cls: float(p) for cls, p in zip(self.icu.classes_, proba)}
        probs = {cls: round(probs.get(cls, 0.0), 4) for cls in ICU_CLASSES}
        level = max(probs, key=probs.get)
        score = sum(probs[c] * ICU_WEIGHTS[c] for c in ICU_CLASSES)
        return {
            "priority_level": level,
            "priority_score": round(score, 1),
            "class_probabilities": probs,
            "model_version": self.metadata["icu_priority"]["version"],
            "disclaimer": DISCLAIMER,
        }


store = ModelStore()
