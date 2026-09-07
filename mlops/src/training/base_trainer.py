"""
base_trainer.py
----------------
Abstract Base Trainer class defining standard lifecycle for ScamShield AI models.
Manages dataset path resolution, training execution, artifact persistence,
and automated registration into the ModelRegistry.
"""
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from src.common.logger import get_logger
from src.common.registry import ModelRegistry
from src.common.path_utils import MLOPS_ROOT, resolve_path


class BaseTrainer(ABC):
    """Abstract base class for independent ScamShield AI model trainers."""

    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
        version: Optional[str] = None,
        models_dir: Optional[str] = None,
    ):
        self.config = config or {}
        self.version = version or self.config.get("training", {}).get(
            "version", f"v{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
        )
        self.logger = get_logger(self.__class__.__name__)
        target_models_dir = models_dir or str(MLOPS_ROOT / "models")
        self.models_dir = resolve_path(target_models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.registry = ModelRegistry(models_dir=str(self.models_dir))

    @abstractmethod
    def load_data(self) -> Any:
        """Loads training and validation records."""
        pass

    @abstractmethod
    def train(self) -> Dict[str, Any]:
        """Executes the model training procedure and returns evaluation metrics."""
        pass

    @abstractmethod
    def save_artifacts(self, output_dir: Optional[str] = None) -> str:
        """Saves weights, parameters, and training_config.json."""
        pass

    def run(self, output_dir: Optional[str] = None) -> Dict[str, Any]:
        """Runs the complete training lifecycle and registers the model version."""
        self.logger.info("--- Starting Training [%s] (Version: %s) ---", self.__class__.__name__, self.version)
        self.load_data()
        metrics = self.train()
        saved_dir = self.save_artifacts(output_dir)

        model_name = self.config.get("model", {}).get(
            "name", self.__class__.__name__.lower().replace("trainer", "_model")
        )
        dataset_ver = self.config.get("data", {}).get("version", "v1.0.0")

        self.registry.register_model(
            model_name=model_name,
            artifacts_dir=saved_dir,
            metrics=metrics,
            parameters=self.config.get("training", {}),
            version=self.version,
            dataset_version=dataset_ver,
        )

        self.logger.info("--- Training Completed for %s (%s) ---", model_name, self.version)
        return {
            "model_name": model_name,
            "version": self.version,
            "metrics": metrics,
            "artifacts_dir": saved_dir,
        }
