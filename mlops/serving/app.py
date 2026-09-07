"""
app.py
------
FastAPI Application Entrypoint for ScamShield AI MLOps Serving Layer.
Loads active Production models dynamically via InferenceManager.
Includes prediction routes, health/readiness, telemetry monitoring, and feedback loop endpoints.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.common.logger import get_logger
from serving.manager import inference_manager
from serving.routes.feedback_routes import router as feedback_router
from serving.routes.health import router as health_router
from serving.routes.message_routes import router as message_router
from serving.routes.scam_type_routes import router as scam_type_router
from serving.routes.url_routes import router as url_router

logger = get_logger("serving.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing ScamShield AI ML inference engines from ModelRegistry...")
    inference_manager.initialize()
    status = inference_manager.get_model_status()
    logger.info(f"Successfully loaded production model versions: {status}")
    yield
    logger.info("Shutting down ScamShield AI ML inference engines...")


def create_app() -> FastAPI:
    app = FastAPI(
        title="ScamShield AI - MLOps Inference Service",
        description="High-throughput anti-scam AI inference API for SMS, URL, and fraud taxonomy detection.",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(message_router)
    app.include_router(scam_type_router)
    app.include_router(url_router)
    app.include_router(feedback_router)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("serving.app:app", host="0.0.0.0", port=8000, reload=True)
