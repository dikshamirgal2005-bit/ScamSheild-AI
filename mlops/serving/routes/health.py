"""
health.py
---------
Health, readiness, hot-reloading, and real-time model monitoring endpoints reporting active backend models.
"""
from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from serving.manager import inference_manager
from serving.schemas import HealthResponse, ModelReloadResponse
from src.common.monitor import prediction_monitor

router = APIRouter(tags=["Health & Monitoring"])


@router.get("/healthz", response_model=HealthResponse)
def health_check() -> HealthResponse:
    if inference_manager.message_predictor is None:
        inference_manager.initialize()

    active_map = inference_manager.get_model_status()
    models_loaded = {
        "message_model": inference_manager.message_predictor is not None,
        "scam_type_model": inference_manager.scam_type_predictor is not None,
        "url_model": inference_manager.url_predictor is not None,
    }

    return HealthResponse(
        status="healthy",
        version="1.0.0",
        models_loaded=models_loaded,
        active_models=active_map,
    )


@router.get("/ready")
def readiness() -> dict:
    if inference_manager.message_predictor is None:
        inference_manager.initialize()

    active_map = inference_manager.get_model_status()
    return {
        "ready": True,
        "active_production_models": active_map,
    }


@router.post("/api/v1/reload", response_model=ModelReloadResponse)
def reload_active_models() -> ModelReloadResponse:
    """Hot-reloads approved Production model versions from ModelRegistry without downtime."""
    if inference_manager.message_predictor is None:
        inference_manager.initialize()

    result = inference_manager.reload_all()
    return ModelReloadResponse(
        status=result["status"],
        reloaded_models=result["reloaded_models"],
    )


@router.get("/api/v1/monitoring/stats")
def get_monitoring_statistics() -> dict:
    """Returns aggregated real-time prediction monitoring statistics, risk distributions, and latency metrics."""
    return prediction_monitor.get_summary_stats()


@router.get("/dashboard", response_class=HTMLResponse)
def get_dashboard_html() -> HTMLResponse:
    """Serves the interactive ScamShield AI MLOps Monitoring Dashboard UI."""
    from src.common.dashboard import dashboard_service
    html_content = dashboard_service.render_html()
    return HTMLResponse(content=html_content, status_code=200)


@router.get("/api/v1/dashboard/summary")
def get_dashboard_data() -> dict:
    """Returns all dataset versions, model versions, metrics, and telemetry in structured JSON."""
    from src.common.dashboard import dashboard_service
    return dashboard_service.get_dashboard_summary()

