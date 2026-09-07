"""
validator.py
------------
Model Validation Engine for ScamShield AI MLOps pipeline.
Validates trained models against minimum performance thresholds and champion models
before allowing promotion to the Production stage.
"""
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .logger import get_logger
from .registry import ModelRegistry
from .path_utils import MLOPS_ROOT, resolve_path

logger = get_logger("ModelValidator")

DEFAULT_VALIDATION_RULES = {
  "message_model": {
    "primary_metric": "f1",
    "min_thresholds": {"f1": 0.85, "accuracy": 0.85, "precision": 0.80, "recall": 0.80},
  },
  "scam_type_model": {
    "primary_metric": "macro_f1",
    "min_thresholds": {"macro_f1": 0.80, "accuracy": 0.80},
  },
  "url_model": {
    "primary_metric": "f1",
    "min_thresholds": {"f1": 0.85, "accuracy": 0.85, "precision": 0.80, "recall": 0.80},
  },
}


class ModelValidator:
    """Validates candidate models against minimum thresholds and current production champion."""

    def __init__(
        self,
        config_path: Optional[str | Path] = None,
        models_dir: Optional[str | Path] = None,
    ):
        self.models_dir = resolve_path(models_dir or (MLOPS_ROOT / "models"))
        self.registry = ModelRegistry(models_dir=str(self.models_dir))
        self.rules = self._load_rules(config_path)

    def _load_rules(self, config_path: Optional[str | Path] = None) -> Dict[str, Any]:
        """Loads validation rules from YAML or returns default dict."""
        path = resolve_path(config_path or (MLOPS_ROOT / "configs" / "model_validation.yaml"))
        if path.exists():
            try:
                import yaml
                with open(path, "r", encoding="utf-8") as f:
                    cfg = yaml.safe_load(f) or {}
                    if "models" in cfg:
                        return cfg["models"]
            except Exception:
                pass
        return DEFAULT_VALIDATION_RULES

    def get_candidate_metrics(self, model_name: str, version: str) -> Dict[str, float]:
        """Extracts numerical metrics from metadata.json or evaluation_results.json."""
        v_dir = self.models_dir / model_name / version
        eval_file = v_dir / "evaluation_results.json"
        meta_file = v_dir / "metadata.json"

        extracted: Dict[str, float] = {}

        if eval_file.exists():
            try:
                with open(eval_file, "r", encoding="utf-8") as f:
                    eval_data = json.load(f)
                m = eval_data.get("metrics", {})
                for k, v in m.items():
                    if isinstance(v, (int, float)):
                        extracted[k] = float(v)
            except Exception:
                pass

        if meta_file.exists():
            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                m = meta.get("metrics", {})
                for k, v in m.items():
                    if isinstance(v, (int, float)) and k not in extracted:
                        extracted[k] = float(v)
            except Exception:
                pass

        # Fallback aliases
        if "f1" not in extracted and "val_f1" in extracted:
            extracted["f1"] = extracted["val_f1"]
        if "accuracy" not in extracted and "train_accuracy" in extracted:
            extracted["accuracy"] = extracted["train_accuracy"]
        if "precision" not in extracted and "val_precision" in extracted:
            extracted["precision"] = extracted["val_precision"]
        if "recall" not in extracted and "val_recall" in extracted:
            extracted["recall"] = extracted["val_recall"]

        return extracted

    def validate_model(
        self,
        model_name: str,
        version: str,
        require_champion_check: bool = True,
        min_improvement_margin: float = 0.00,
    ) -> Dict[str, Any]:
        """
        Validates candidate model against minimum performance thresholds and champion model.
        Returns detailed validation result dictionary.
        """
        model_rules = self.rules.get(model_name, DEFAULT_VALIDATION_RULES.get(model_name, {}))
        min_thresholds = model_rules.get("min_thresholds", {"accuracy": 0.80})
        primary_metric_name = model_rules.get("primary_metric", "f1")

        candidate_metrics = self.get_candidate_metrics(model_name, version)
        rejection_reasons: List[str] = []
        passed_thresholds = True
        passed_champion_check = True

        # 1. Minimum Threshold Check
        for metric_name, min_val in min_thresholds.items():
            cand_val = candidate_metrics.get(metric_name)
            if cand_val is None:
                # Try fallback matching
                alt = [v for k, v in candidate_metrics.items() if metric_name in k]
                cand_val = alt[0] if alt else None

            if cand_val is None:
                rejection_reasons.append(
                    f"Required metric '{metric_name}' missing in evaluation results for version '{version}'"
                )
                passed_thresholds = False
            elif cand_val < min_val:
                rejection_reasons.append(
                    f"Metric '{metric_name}' ({cand_val:.4f}) is below minimum threshold ({min_val:.4f})"
                )
                passed_thresholds = False

        # 2. Champion vs Challenger Check
        champion_version: Optional[str] = None
        champion_metric_val: Optional[float] = None
        challenger_metric_val: Optional[float] = candidate_metrics.get(primary_metric_name)

        if require_champion_check:
            try:
                _, champ_meta = self.registry.get_active_model(model_name)
                champ_v = champ_meta.get("version")
                # Only compare if champion is a different version
                if champ_v and champ_v != version:
                    champion_version = champ_v
                    champ_metrics = self.get_candidate_metrics(model_name, champ_v)
                    champion_metric_val = champ_metrics.get(primary_metric_name)

                    if challenger_metric_val is not None and champion_metric_val is not None:
                        required_min = champion_metric_val + min_improvement_margin
                        if challenger_metric_val < required_min:
                            rejection_reasons.append(
                                f"Challenger primary metric '{primary_metric_name}' ({challenger_metric_val:.4f}) "
                                f"does not meet Production champion '{champion_version}' ({champion_metric_val:.4f} + margin {min_improvement_margin:.4f})"
                            )
                            passed_champion_check = False
            except KeyError:
                # No champion currently in Production -> champion check passes automatically
                pass

        is_valid = passed_thresholds and passed_champion_check

        res = {
            "is_valid": is_valid,
            "model_name": model_name,
            "version": version,
            "passed_thresholds": passed_thresholds,
            "passed_champion_check": passed_champion_check,
            "primary_metric": primary_metric_name,
            "rejection_reasons": rejection_reasons,
            "metrics_evaluated": candidate_metrics,
            "min_thresholds_applied": min_thresholds,
            "champion_version": champion_version,
            "champion_metric": champion_metric_val,
            "challenger_metric": challenger_metric_val,
            "validated_at": datetime.now(timezone.utc).isoformat(),
        }

        if is_valid:
            logger.info(
                f"Model '{model_name}' version '{version}' PASSED validation checks (Primary {primary_metric_name}: {challenger_metric_val})"
            )
        else:
            logger.warning(
                f"Model '{model_name}' version '{version}' REJECTED by validator: {'; '.join(rejection_reasons)}"
            )

        return res
