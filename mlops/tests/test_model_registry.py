"""
test_model_registry.py
----------------------
Unit tests for ScamShield AI Model Registry stage tracking, promotion, and backend active model identification.
"""
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from src.common.registry import ModelRegistry


class TestModelRegistry(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.models_dir = Path(self.test_dir) / "models"
        self.registry = ModelRegistry(models_dir=self.models_dir)

        # Create dummy artifacts directory
        self.artifacts_v1 = Path(self.test_dir) / "artifacts_v1"
        self.artifacts_v1.mkdir(parents=True, exist_ok=True)
        with open(self.artifacts_v1 / "model.json", "w", encoding="utf-8") as f:
            json.dump({"weights": [0.1, 0.2]}, f)

        self.artifacts_v2 = Path(self.test_dir) / "artifacts_v2"
        self.artifacts_v2.mkdir(parents=True, exist_ok=True)
        with open(self.artifacts_v2 / "model.json", "w", encoding="utf-8") as f:
            json.dump({"weights": [0.5, 0.6]}, f)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_register_model_tracking_fields(self):
        v_name = self.registry.register_model(
            model_name="message_model",
            artifacts_dir=self.artifacts_v1,
            metrics={"f1": 0.95, "accuracy": 0.96},
            parameters={"epochs": 5, "lr": 0.001},
            version="v1.0.0",
            dataset_version="v1.0.0",
            status="Development",
        )
        self.assertEqual(v_name, "v1.0.0")

        v_dir, meta = self.registry.get_model("message_model", version="v1.0.0")
        self.assertEqual(meta["model_name"], "message_model")
        self.assertEqual(meta["version"], "v1.0.0")
        self.assertEqual(meta["dataset_version"], "v1.0.0")
        self.assertEqual(meta["status"], "Development")
        self.assertIn("training_date", meta)
        self.assertEqual(meta["metrics"]["f1"], 0.95)

    def test_promote_model_stage_transition(self):
        self.registry.register_model(
            model_name="scam_type_model",
            artifacts_dir=self.artifacts_v1,
            metrics={"macro_f1": 0.92, "accuracy": 0.90},
            parameters={"epochs": 8},
            version="v1.0.0",
            dataset_version="v1.0.0",
            status="Development",
        )

        # Promote v1.0.0 to Testing
        meta_test = self.registry.promote_model("scam_type_model", version="v1.0.0", stage="Testing")
        self.assertEqual(meta_test["status"], "Testing")

        # Promote v1.0.0 to Production
        meta_prod = self.registry.promote_model("scam_type_model", version="v1.0.0", stage="Production")
        self.assertEqual(meta_prod["status"], "Production")

        # Verify active backend production model lookup
        active_path, active_meta = self.registry.get_active_model("scam_type_model")
        self.assertEqual(active_meta["version"], "v1.0.0")
        self.assertEqual(active_meta["status"], "Production")

    def test_production_demotion_on_new_promotion(self):
        # Register v1.0.0 and promote to Production
        self.registry.register_model(
            model_name="url_model",
            artifacts_dir=self.artifacts_v1,
            metrics={"f1": 0.92, "accuracy": 0.94, "precision": 0.90, "recall": 0.90},
            parameters={},
            version="v1.0.0",
            status="Production",
        )

        # Register v2.0.0 with better metrics
        self.registry.register_model(
            model_name="url_model",
            artifacts_dir=self.artifacts_v2,
            metrics={"f1": 0.96, "accuracy": 0.98, "precision": 0.95, "recall": 0.95},
            parameters={},
            version="v2.0.0",
            status="Development",
        )

        # Active production is initially v1.0.0
        _, active_meta_1 = self.registry.get_active_model("url_model")
        self.assertEqual(active_meta_1["version"], "v1.0.0")

        # Promote v2.0.0 to Production
        self.registry.promote_model("url_model", version="v2.0.0", stage="Production")

        # Active production should now be v2.0.0, and v1.0.0 demoted to Archived
        _, active_meta_2 = self.registry.get_active_model("url_model")
        self.assertEqual(active_meta_2["version"], "v2.0.0")

        _, old_meta = self.registry.get_model("url_model", version="v1.0.0")
        self.assertEqual(old_meta["status"], "Archived")

    def test_get_backend_active_models(self):
        self.registry.register_model(
            model_name="message_model",
            artifacts_dir=self.artifacts_v1,
            metrics={"f1": 0.96},
            parameters={},
            version="v1.0.0",
            status="Production",
        )
        self.registry.register_model(
            model_name="url_model",
            artifacts_dir=self.artifacts_v1,
            metrics={"f1": 0.97},
            parameters={},
            version="v1.0.0",
            status="Testing",
        )

        active_models = self.registry.get_backend_active_models()
        self.assertIn("message_model", active_models)
        self.assertIn("url_model", active_models)
        self.assertEqual(active_models["message_model"]["active_version"], "v1.0.0")
        self.assertTrue(active_models["message_model"]["is_production"])


if __name__ == "__main__":
    unittest.main()
