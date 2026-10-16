from typing import Literal, Optional

from pydantic import BaseModel, Field


class ReadmissionRequest(BaseModel):
    age: int = Field(..., ge=0, le=120)
    gender: Literal["MALE", "FEMALE", "OTHER"]
    length_of_stay_days: float = Field(..., ge=0, le=365)
    prior_admissions_12m: int = Field(..., ge=0, le=100)
    prior_readmissions: int = Field(..., ge=0, le=100)
    medical_record_count: int = Field(..., ge=0, le=1000)
    had_icu_stay: bool
    is_readmission: bool
    days_since_previous_discharge: Optional[int] = Field(None, ge=0, le=36500)


class Factor(BaseModel):
    feature: str
    label: str
    value: float
    contribution: float


class ReadmissionResponse(BaseModel):
    probability: float
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    model_version: str
    top_factors: list[Factor]
    disclaimer: str


class IcuPriorityRequest(BaseModel):
    age: int = Field(..., ge=0, le=120)
    heart_rate: int = Field(..., ge=20, le=250)
    systolic_bp: int = Field(..., ge=40, le=260)
    respiratory_rate: int = Field(..., ge=4, le=60)
    spo2: int = Field(..., ge=50, le=100)
    temperature: float = Field(..., ge=30.0, le=43.0)
    gcs: int = Field(..., ge=3, le=15)
    requires_ventilation: bool
    comorbidity_count: int = Field(..., ge=0, le=20)


class IcuPriorityResponse(BaseModel):
    priority_level: Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]
    priority_score: float
    class_probabilities: dict[str, float]
    model_version: str
    disclaimer: str
