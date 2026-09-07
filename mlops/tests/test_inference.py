"""
test_inference.py
-----------------
Unit tests verifying inference predictors against expected schemas and ModelRegistry integration.
"""
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from src.common.registry import ModelRegistry
from src.inference.message_predictor import MessagePredictor
from src.inference.scam_type_predictor import ScamTypePredictor
from src.inference.url_predictor import URLPredictor


class TestInference(unittest.TestCase):
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

        # Register and promote v1.0.0 to Production
        self.registry.register_model(
            model_name="message_model",
            artifacts_dir=self.artifacts_v1,
            metrics={"f1": 0.90, "accuracy": 0.92, "precision": 0.88, "recall": 0.89},
            parameters={},
            version="v1.0.0",
            status="Production",
        )

        self.msg_predictor = MessagePredictor(models_dir=self.models_dir)
        self.scam_predictor = ScamTypePredictor(models_dir=self.models_dir)
        self.url_predictor = URLPredictor(models_dir=self.models_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_message_predictor_schema(self):
        result = self.msg_predictor.predict("Urgent: Your account is suspended. Update KYC at https://fake.com immediately!")
        self.assertIn("riskScore", result)
        self.assertIn("status", result)
        self.assertIn("statusLabel", result)
        self.assertIn("verdict", result)
        self.assertIn("reason", result)
        self.assertIn("indicators", result)
        self.assertIn("recommendations", result)
        self.assertIn("scamType", result)
        self.assertIn("probability", result)
        self.assertIn("modelVersion", result)

        self.assertIn(result["status"], ["safe", "warning", "danger"])
        self.assertGreaterEqual(result["riskScore"], 70)
        self.assertEqual(result["status"], "danger")

    def test_message_predictor_safe(self):
        result = self.msg_predictor.predict("Hey, see you at the library at 5 PM.")
        self.assertEqual(result["status"], "safe")
        self.assertLess(result["riskScore"], 40)

    def test_scam_type_predictor(self):
        result = self.scam_predictor.predict("Work from home job offer! Earn $500 daily on Telegram.")
        self.assertIn("topScamType", result)
        self.assertIn("confidence", result)
        self.assertIn("distribution", result)
        self.assertIn("supportedCategories", result)
        self.assertEqual(result["topScamType"], "job_recruitment")

    def test_url_predictor_schema(self):
        result = self.url_predictor.predict("http://192.168.1.100/secure-banking-login")
        self.assertIn("url", result)
        self.assertIn("riskScore", result)
        self.assertIn("status", result)
        self.assertIn("statusLabel", result)
        self.assertIn("verdict", result)
        self.assertIn("flags", result)
        self.assertIn("features", result)
        self.assertIn("liveCheck", result)

        self.assertIn(result["status"], ["safe", "suspicious", "malicious"])
        self.assertGreater(len(result["flags"]), 0)

    def test_predictor_hot_reload_on_new_production_promotion(self):
        # Verify initial loaded version is v1.0.0
        self.assertEqual(self.msg_predictor.loaded_version, "v1.0.0")

        # Register v2.0.0 with better metrics and promote to Production
        self.registry.register_model(
            model_name="message_model",
            artifacts_dir=self.artifacts_v2,
            metrics={"f1": 0.96, "accuracy": 0.97, "precision": 0.95, "recall": 0.95},
            parameters={},
            version="v2.0.0",
            status="Development",
        )
        self.registry.promote_model("message_model", version="v2.0.0", stage="Production")

        # Call reload on predictor
        new_v = self.msg_predictor.reload()
        self.assertEqual(new_v, "v2.0.0")
        self.assertEqual(self.msg_predictor.loaded_version, "v2.0.0")

        res = self.msg_predictor.predict("Test message")
        self.assertEqual(res["modelVersion"], "v2.0.0")


if __name__ == "__main__":
    unittest.main()
