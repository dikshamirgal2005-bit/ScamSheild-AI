import time
from fastapi import APIRouter, Depends
from serving.manager import inference_manager
from serving.schemas import ScamTypeRequest, ScamTypeResponse
from src.common.monitor import prediction_monitor
from src.inference.scam_type_predictor import ScamTypePredictor

router = APIRouter(prefix="/api/v1/scan", tags=["Scam Type"])


def get_scam_type_predictor() -> ScamTypePredictor:
    if inference_manager.scam_type_predictor is None:
        inference_manager.initialize()
    return inference_manager.scam_type_predictor


@router.post("/scam-type", response_model=ScamTypeResponse)
def categorize_scam(
    req: ScamTypeRequest,
    predictor: ScamTypePredictor = Depends(get_scam_type_predictor),
) -> ScamTypeResponse:
    start_t = time.time()
    result = predictor.predict(req.text)
    latency_ms = (time.time() - start_t) * 1000.0

    # Record anonymized prediction telemetry
    prediction_monitor.log_prediction(
        input_type="scam_type",
        model_name="scam_type_model",
        model_version=predictor.loaded_version or "v1.0.0",
        prediction_result=result,
        raw_input=req.text,
        execution_time_ms=latency_ms,
    )

    return ScamTypeResponse(
        topScamType=result["topScamType"],
        displayName=result["displayName"],
        confidence=result["confidence"],
        distribution=result["distribution"],
        supportedCategories=result["supportedCategories"],
        modelVersion=result.get("modelVersion"),
    )
