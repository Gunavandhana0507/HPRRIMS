import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException

from app.models import store
from app.schemas import (
    IcuPriorityRequest,
    IcuPriorityResponse,
    ReadmissionRequest,
    ReadmissionResponse,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    store.load()
    yield


app = FastAPI(
    title="HPRRIMS ML Service",
    version="1.0.0",
    description="Readmission risk (logistic regression) and ICU priority (random forest) models trained on synthetic data.",
    lifespan=lifespan,
)


def verify_key(x_service_key: str | None = Header(default=None)) -> None:
    expected = os.getenv("ML_SERVICE_API_KEY")
    if expected and x_service_key != expected:
        raise HTTPException(status_code=401, detail="Invalid service key")


@app.get("/health")
def health():
    return {"status": "UP" if store.ready else "DOWN", "models_loaded": store.ready}


@app.get("/models", dependencies=[Depends(verify_key)])
def models():
    return store.metadata


@app.post("/predict/readmission", response_model=ReadmissionResponse, dependencies=[Depends(verify_key)])
def predict_readmission(payload: ReadmissionRequest):
    return store.predict_readmission(payload)


@app.post("/predict/icu-priority", response_model=IcuPriorityResponse, dependencies=[Depends(verify_key)])
def predict_icu(payload: IcuPriorityRequest):
    return store.predict_icu(payload)
