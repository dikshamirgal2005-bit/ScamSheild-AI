"""
manager.py
----------
Inference Manager for ScamShield AI FastAPI Serving Layer.
Coordinates dynamic model loading, active production version tracking, and hot reloading.
"""
from pathlib import Path
from typing import Any, Dict, Optional

from src.common.logger import get_logger
from src.inference.message_predictor import MessagePredictor
from src.inference.scam_type_predictor import ScamTypePredictor
from src.inference.url_predictor import URLPredictor
from src.training.base_trainer import MLOPS_ROOT, resolve_path

logger = get_logger("InferenceManager")


class InferenceManager:
    """Manages predictor instances and coordinates live model version reloading."""

    def __init__(self, models_dir: Optional[str | Path] = None):
        self.models_dir = resolve_path(models_dir or (MLOPS_ROOT / "models"))
        self.message_predictor: Optional[MessagePredictor] = None
        self.scam_type_predictor: Optional[ScamTypePredictor] = None
        self.url_predictor: Optional[URLPredictor] = None

    def initialize(self) -> None:
        """Initializes and loads all active production model versions."""
        logger.info(f"Initializing InferenceManager with models directory: {self.models_dir}")
        self.message_predictor = MessagePredictor(models_dir=self.models_dir, version="production")
        self.scam_type_predictor = ScamTypePredictor(models_dir=self.models_dir, version="production")
        self.url_predictor = URLPredictor(models_dir=self.models_dir, version="production")

    def reload_all(self) -> Dict[str, Any]:
        """Hot-reloads all active model versions from ModelRegistry."""
        logger.info("Hot-reloading active production models across all inference engines...")
        m_ver = self.message_predictor.reload() if self.message_predictor else "N/A"
        s_ver = self.scam_type_predictor.reload() if self.scam_type_predictor else "N/A"
        u_ver = self.url_predictor.reload() if self.url_predictor else "N/A"

        return {
            "status": "success",
            "reloaded_models": {
                "message_model": m_ver,
                "scam_type_model": s_ver,
                "url_model": u_ver,
            },
        }

    def get_model_status(self) -> Dict[str, Any]:
        """Returns metadata for currently loaded in-memory predictors."""
        return {
            "message_model": {
                "loaded_version": self.message_predictor.loaded_version if self.message_predictor else None,
                "stage": self.message_predictor.metadata.get("status", "Unknown") if self.message_predictor else None,
                "dataset_version": self.message_predictor.metadata.get("dataset_version") if self.message_predictor else None,
                "artifacts_path": str(self.message_predictor.artifacts_dir) if self.message_predictor else None,
            },
            "scam_type_model": {
                "loaded_version": self.scam_type_predictor.loaded_version if self.scam_type_predictor else None,
                "stage": self.scam_type_predictor.metadata.get("status", "Unknown") if self.scam_type_predictor else None,
                "dataset_version": self.scam_type_predictor.metadata.get("dataset_version") if self.scam_type_predictor else None,
                "artifacts_path": str(self.scam_type_predictor.artifacts_dir) if self.scam_type_predictor else None,
            },
            "url_model": {
                "loaded_version": self.url_predictor.loaded_version if self.url_predictor else None,
                "stage": self.url_predictor.metadata.get("status", "Unknown") if self.url_predictor else None,
                "dataset_version": self.url_predictor.metadata.get("dataset_version") if self.url_predictor else None,
                "artifacts_path": str(self.url_predictor.artifacts_dir) if self.url_predictor else None,
            },
        }


# Global singleton instance for FastAPI serving
inference_manager = InferenceManager()
