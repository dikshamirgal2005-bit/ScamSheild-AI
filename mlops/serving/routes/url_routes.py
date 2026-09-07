import time
from fastapi import APIRouter, Depends
from serving.manager import inference_manager
from serving.schemas import URLScanRequest, URLScanResponse
from src.common.monitor import prediction_monitor
from src.inference.url_predictor import URLPredictor

router = APIRouter(prefix="/api/v1/scan", tags=["URL Scan"])


def get_url_predictor() -> URLPredictor:
    if inference_manager.url_predictor is None:
        inference_manager.initialize()
    return inference_manager.url_predictor


@router.post("/url", response_model=URLScanResponse)
def scan_url(
    req: URLScanRequest,
    predictor: URLPredictor = Depends(get_url_predictor),
) -> URLScanResponse:
    start_t = time.time()
    result = predictor.predict(req.url)
    latency_ms = (time.time() - start_t) * 1000.0

    # Record anonymized prediction telemetry
    prediction_monitor.log_prediction(
        input_type="url",
        model_name="url_model",
        model_version=predictor.loaded_version or "v1.0.0",
        prediction_result=result,
        raw_input=req.url,
        execution_time_ms=latency_ms,
    )

    return URLScanResponse(
        url=result["url"],
        riskScore=result["riskScore"],
        status=result["status"],
        statusLabel=result["statusLabel"],
        verdict=result["verdict"],
        flags=result["flags"],
        features=result["features"],
        liveCheck=result.get("liveCheck", {}),
        modelVersion=result.get("modelVersion"),
    )
