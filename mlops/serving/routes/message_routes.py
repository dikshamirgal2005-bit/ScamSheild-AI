import time
from fastapi import APIRouter, Depends
from serving.manager import inference_manager
from serving.schemas import MessageScanRequest, MessageScanResponse
from src.common.monitor import prediction_monitor
from src.inference.message_predictor import MessagePredictor

router = APIRouter(prefix="/api/v1/scan", tags=["Message Scan"])


def get_message_predictor() -> MessagePredictor:
    if inference_manager.message_predictor is None:
        inference_manager.initialize()
    return inference_manager.message_predictor


@router.post("/message", response_model=MessageScanResponse)
def scan_message(
    req: MessageScanRequest,
    predictor: MessagePredictor = Depends(get_message_predictor),
) -> MessageScanResponse:
    start_t = time.time()
    result = predictor.predict(req.text)
    latency_ms = (time.time() - start_t) * 1000.0

    # Record anonymized prediction telemetry
    prediction_monitor.log_prediction(
        input_type="message",
        model_name="message_model",
        model_version=predictor.loaded_version or "v1.0.0",
        prediction_result=result,
        raw_input=req.text,
        execution_time_ms=latency_ms,
    )

    return MessageScanResponse(
        riskScore=result["riskScore"],
        status=result["status"],
        statusLabel=result["statusLabel"],
        verdict=result["verdict"],
        reason=result["reason"],
        indicators=result["indicators"],
        recommendations=result["recommendations"],
        scamType=result["scamType"],
        probability=result["probability"],
        modelVersion=result.get("modelVersion"),
    )
