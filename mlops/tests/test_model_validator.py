"""
test_model_validator.py
------------------------
Unit tests for ScamShield AI Model Validation Engine.
Tests threshold checks, champion vs challenger comparison, model rejection, and force overrides.
"""
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from src.common.registry import ModelRegistry
from src.common.validator import ModelValidator


class TestModelValidator(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.models_dir = Path(self.test_dir) / "models"
        self.registry = ModelRegistry(models_dir=self.models_dir)

        # Create dummy artifacts directory
        self.artifacts_dir = Path(self.test_dir) / "artifacts"
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)
        with open(self.artifacts_dir / "model.json", "w", encoding="utf-8") as f:
            json.dump({"weights": [0.1, 0.2]}, f)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_validate_model_pass_thresholds(self):
        # Register a model meeting minimum thresholds (f1 >= 0.85, accuracy >= 0.85)
        self.registry.register_model(
            model_name="message_model",
            artifacts_dir=self.artifacts_dir,
            metrics={"f1": 0.92, "accuracy": 0.94, "precision": 0.90, "recall": 0.91},
            parameters={},
            version="v1.0.0",
            status="Testing",
        )

        validator = ModelValidator(models_dir=self.models_dir)
        res = validator.validate_model("message_model", "v1.0.0")
        self.assertTrue(res["is_valid"])
        self.assertTrue(res["passed_thresholds"])
        self.assertEqual(len(res["rejection_reasons"]), 0)

    def test_validate_model_fail_thresholds(self):
        # Register a model below minimum threshold (f1 < 0.85)
        self.registry.register_model(
            model_name="message_model",
            artifacts_dir=self.artifacts_dir,
            metrics={"f1": 0.70, "accuracy": 0.75, "precision": 0.68, "recall": 0.72},
            parameters={},
            version="v1.0.0",
            status="Testing",
        )

        validator = ModelValidator(models_dir=self.models_dir)
        res = validator.validate_model("message_model", "v1.0.0")
        self.assertFalse(res["is_valid"])
        self.assertFalse(res["passed_thresholds"])
        self.assertTrue(any("below minimum threshold" in r for r in res["rejection_reasons"]))

    def test_champion_vs_challenger_comparison(self):
        # Champion v1.0.0 in Production with f1 = 0.90
        self.registry.register_model(
            model_name="message_model",
            artifacts_dir=self.artifacts_dir,
            metrics={"f1": 0.90, "accuracy": 0.91, "precision": 0.88, "recall": 0.89},
            parameters={},
            version="v1.0.0",
            status="Production",
        )

        # Challenger v2.0.0 with lower f1 = 0.87 (passes threshold 0.85, but fails champion 0.90)
        self.registry.register_model(
            model_name="message_model",
            artifacts_dir=self.artifacts_dir,
            metrics={"f1": 0.87, "accuracy": 0.88, "precision": 0.86, "recall": 0.87},
            parameters={},
            version="v2.0.0",
            status="Testing",
        )

        validator = ModelValidator(models_dir=self.models_dir)
        res = validator.validate_model("message_model", "v2.0.0", require_champion_check=True)
        self.assertFalse(res["is_valid"])
        self.assertTrue(res["passed_thresholds"])
        self.assertFalse(res["passed_champion_check"])
        self.assertTrue(any("does not meet Production champion" in r for r in res["rejection_reasons"]))

    def test_registry_promote_rejection_and_force_override(self):
        # Register v1.0.0 below threshold
        self.registry.register_model(
            model_name="url_model",
            artifacts_dir=self.artifacts_dir,
            metrics={"f1": 0.60, "accuracy": 0.65},
            parameters={},
            version="v1.0.0",
            status="Testing",
        )

        # Promotion without force should raise ValueError and mark status as Rejected
        with self.assertRaises(ValueError):
            self.registry.promote_model("url_model", version="v1.0.0", stage="Production", force=False)

        _, meta_rejected = self.registry.get_model("url_model", version="v1.0.0")
        self.assertEqual(meta_rejected["status"], "Rejected")

        # Promotion with force=True should succeed
        meta_forced = self.registry.promote_model("url_model", version="v1.0.0", stage="Production", force=True)
        self.assertEqual(meta_forced["status"], "Production")


if __name__ == "__main__":
    unittest.main()
