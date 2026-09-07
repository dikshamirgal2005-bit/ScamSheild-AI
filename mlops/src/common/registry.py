"""
registry.py
-----------
Model Registry interface for ScamShield AI.
Tracks trained models using version number, model name, training date, dataset version,
evaluation metrics, and stage status (Development, Testing, Production, Archived).
Enables the backend to identify and load the active Production model version.
"""
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .logger import get_logger
from .path_utils import MLOPS_ROOT, resolve_path

logger = get_logger("ModelRegistry")

VALID_STAGES = ["Development", "Testing", "Production", "Archived"]


class ModelRegistry:
    """Manages model metadata, version tracking, stage promotions, and backend active models."""

    def __init__(self, models_dir: Optional[str | Path] = None):
        target = models_dir or (MLOPS_ROOT / "models")
        self.models_dir = resolve_path(target)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.catalog_file = self.models_dir / "catalog.json"
        self._init_catalog()

    def _init_catalog(self) -> None:
        """Initializes the catalog JSON file if it does not exist."""
        if not self.catalog_file.exists():
            with open(self.catalog_file, "w", encoding="utf-8") as f:
                json.dump({"catalog_version": "1.0", "models": {}}, f, indent=2)

    def _read_catalog(self) -> Dict[str, Any]:
        """Reads master catalog JSON."""
        try:
            with open(self.catalog_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"catalog_version": "1.0", "models": {}}

    def _write_catalog(self, catalog: Dict[str, Any]) -> None:
        """Writes master catalog JSON."""
        with open(self.catalog_file, "w", encoding="utf-8") as f:
            json.dump(catalog, f, indent=2)

    def register_model(
        self,
        model_name: str,
        artifacts_dir: str | Path,
        metrics: Dict[str, Any],
        parameters: Dict[str, Any],
        version: Optional[str] = None,
        dataset_version: Optional[str] = None,
        status: str = "Development",
    ) -> str:
        """
        Registers a trained model version, saves metadata.json, and updates the catalog.
        """
        if not version:
            version = f"v{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

        if status not in VALID_STAGES:
            status = "Development"

        target_dir = self.models_dir / model_name / version
        target_dir.mkdir(parents=True, exist_ok=True)

        src_path = Path(artifacts_dir)
        if src_path.resolve() != target_dir.resolve() and src_path.exists():
            for item in os.listdir(src_path):
                s = src_path / item
                d = target_dir / item
                if s.is_dir():
                    shutil.copytree(s, d, dirs_exist_ok=True)
                elif s.is_file() and item != ".gitkeep":
                    shutil.copy2(s, d)

        created_at = datetime.now(timezone.utc).isoformat()

        metadata: Dict[str, Any] = {
            "model_name": model_name,
            "version": version,
            "training_date": created_at,
            "created_at": created_at,
            "dataset_version": dataset_version or "v1.0.0",
            "status": status,
            "stage": status,
            "metrics": metrics,
            "parameters": parameters,
            "artifacts_path": str(target_dir),
        }

        # Check for existing evaluation results to attach
        eval_file = target_dir / "evaluation_results.json"
        if eval_file.exists():
            try:
                with open(eval_file, "r", encoding="utf-8") as f:
                    eval_data = json.load(f)
                metadata["evaluation_results"] = eval_data.get("metrics", {})
                if status == "Development":
                    metadata["status"] = "Testing"
                    metadata["stage"] = "Testing"
            except Exception:
                pass

        meta_path = target_dir / "metadata.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        catalog = self._read_catalog()
        if model_name not in catalog["models"]:
            catalog["models"][model_name] = {
                "latest": version,
                "production": None,
                "versions": {},
            }

        catalog["models"][model_name]["latest"] = version
        catalog["models"][model_name]["versions"][version] = {
            "version": version,
            "model_name": model_name,
            "training_date": created_at,
            "dataset_version": dataset_version or "v1.0.0",
            "status": metadata["status"],
            "metrics": metrics,
            "path": str(target_dir),
        }

        if status == "Production":
            catalog["models"][model_name]["production"] = version

        self._write_catalog(catalog)
        logger.info(f"Registered model '{model_name}' version '{version}' (Status: {metadata['status']}) at {target_dir}")
        return version

    def promote_model(
        self,
        model_name: str,
        version: str,
        stage: str = "Production",
        force: bool = False,
    ) -> Dict[str, Any]:
        """
        Promotes a model version to a stage (Development, Testing, Production, Archived).
        Before promoting to Production, automatically validates metrics against minimum thresholds
        and the current champion model unless force=True.
        """
        stage_title = stage.capitalize()
        if stage_title not in VALID_STAGES and stage_title != "Rejected":
            raise ValueError(f"Invalid stage '{stage}'. Must be one of {VALID_STAGES}")

        catalog = self._read_catalog()
        if model_name not in catalog.get("models", {}):
            raise KeyError(f"Model '{model_name}' not found in registry.")

        m_info = catalog["models"][model_name]
        if version not in m_info.get("versions", {}):
            raise KeyError(f"Version '{version}' for model '{model_name}' not found in catalog.")

        v_dir = self.models_dir / model_name / version
        meta_path = v_dir / "metadata.json"

        meta: Dict[str, Any] = {}
        if meta_path.exists():
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)

        # Automated Model Validation before marking Production
        if stage_title == "Production" and not force:
            from .validator import ModelValidator
            validator = ModelValidator(models_dir=self.models_dir)
            val_res = validator.validate_model(model_name, version)
            meta["validation_result"] = val_res

            if not val_res["is_valid"]:
                meta["status"] = "Rejected"
                meta["stage"] = "Rejected"
                with open(meta_path, "w", encoding="utf-8") as f:
                    json.dump(meta, f, indent=2)
                m_info["versions"][version]["status"] = "Rejected"
                self._write_catalog(catalog)
                reasons = "; ".join(val_res["rejection_reasons"])
                raise ValueError(
                    f"Model validation FAILED for '{model_name}' version '{version}'. Rejection reasons: {reasons}"
                )

        meta["status"] = stage_title
        meta["stage"] = stage_title
        meta["promoted_at"] = datetime.now(timezone.utc).isoformat()

        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        m_info["versions"][version]["status"] = stage_title

        if stage_title == "Production":
            # Demote any existing production versions to Testing/Archived in catalog
            old_prod = m_info.get("production")
            if old_prod and old_prod != version and old_prod in m_info["versions"]:
                m_info["versions"][old_prod]["status"] = "Archived"
                old_meta_path = self.models_dir / model_name / old_prod / "metadata.json"
                if old_meta_path.exists():
                    try:
                        with open(old_meta_path, "r", encoding="utf-8") as f:
                            o_meta = json.load(f)
                        o_meta["status"] = "Archived"
                        o_meta["stage"] = "Archived"
                        with open(old_meta_path, "w", encoding="utf-8") as f:
                            json.dump(o_meta, f, indent=2)
                    except Exception:
                        pass
            m_info["production"] = version

        self._write_catalog(catalog)
        logger.info(f"Promoted model '{model_name}' version '{version}' to stage '{stage_title}'")
        return meta

    def get_model(self, model_name: str, version: str = "latest") -> Tuple[Path, Dict[str, Any]]:
        """Retrieves model directory path and metadata for a specific version or alias ('latest', 'production')."""
        catalog = self._read_catalog()
        if model_name not in catalog.get("models", {}):
            raise KeyError(f"Model '{model_name}' not found in registry.")

        m_info = catalog["models"][model_name]
        if version == "production" or version == "active":
            target_version = m_info.get("production") or m_info.get("latest")
        elif version == "latest":
            target_version = m_info.get("latest")
        else:
            target_version = version

        v_dir = self.models_dir / model_name / str(target_version)
        meta_path = v_dir / "metadata.json"
        if not meta_path.exists():
            raise FileNotFoundError(f"Model metadata not found at: {meta_path}")

        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        return v_dir, meta

    def get_active_model(self, model_name: str) -> Tuple[Path, Dict[str, Any]]:
        """Identifies and returns the model version currently active for backend inference."""
        return self.get_model(model_name, version="production")

    def get_backend_active_models(self) -> Dict[str, Dict[str, Any]]:
        """Returns a mapping of all registered models and their active backend production versions."""
        catalog = self._read_catalog()
        active_map: Dict[str, Dict[str, Any]] = {}

        for m_name, m_data in catalog.get("models", {}).items():
            prod_v = m_data.get("production") or m_data.get("latest")
            if prod_v and prod_v in m_data.get("versions", {}):
                v_info = m_data["versions"][prod_v]
                active_map[m_name] = {
                    "active_version": prod_v,
                    "status": v_info.get("status", "Development"),
                    "is_production": m_data.get("production") == prod_v,
                    "training_date": v_info.get("training_date"),
                    "dataset_version": v_info.get("dataset_version"),
                    "metrics": v_info.get("metrics", {}),
                    "path": v_info.get("path"),
                }
        return active_map

    def list_models(self, model_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists all registered models, versions, training dates, dataset versions, metrics, and stage status."""
        catalog = self._read_catalog()
        models = catalog.get("models", {})
        results: List[Dict[str, Any]] = []

        target_names = [model_name] if model_name else list(models.keys())

        for name in target_names:
            if name in models:
                m = models[name]
                prod_version = m.get("production")
                latest_version = m.get("latest")
                for v_name, v_data in m.get("versions", {}).items():
                    results.append({
                        "model_name": name,
                        "version": v_name,
                        "training_date": v_data.get("training_date", v_data.get("created_at")),
                        "dataset_version": v_data.get("dataset_version", "v1.0.0"),
                        "status": v_data.get("status", "Development"),
                        "is_latest": v_name == latest_version,
                        "is_production": v_name == prod_version,
                        "metrics": v_data.get("metrics", {}),
                        "path": v_data.get("path"),
                    })
        return results
