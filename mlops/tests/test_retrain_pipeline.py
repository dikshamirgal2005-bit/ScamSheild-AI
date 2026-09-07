"""
test_retrain_pipeline.py
-------------------------
Unit tests for ScamShield AI Controlled Model Retraining Pipeline.
Tests dataset versioning with feedback ingestion, candidate model training, automated evaluation,
and champion validation gatekeeping.
"""
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from src.common.feedback import FeedbackManager
from src.common.registry import ModelRegistry
from src.training.retrain_pipeline import RetrainPipeline


class TestRetrainPipeline(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.root_dir = Path(self.test_dir) / "mlops"
        self.root_dir.mkdir(parents=True, exist_ok=True)

        # Create directory structure
        (self.root_dir / "data" / "sample").mkdir(parents=True, exist_ok=True)
        (self.root_dir / "data" / "versions").mkdir(parents=True, exist_ok=True)
        (self.root_dir / "data" / "processed").mkdir(parents=True, exist_ok=True)
        (self.root_dir / "data" / "feedback").mkdir(parents=True, exist_ok=True)
        (self.root_dir / "models").mkdir(parents=True, exist_ok=True)
        (self.root_dir / "configs").mkdir(parents=True, exist_ok=True)

        # Copy sample dataset to test dir
        sample_messages = [
            {"text": "Urgent: Verify bank account immediately!", "label": "scam"},
            {"text": "Hey mom, see you tomorrow at lunch.", "label": "safe"},
            {"text": "You won $10,000 cash prize! Claim now.", "label": "scam"},
        ]
        with open(self.root_dir / "data" / "sample" / "sample_messages.json", "w", encoding="utf-8") as f:
            json.dump(sample_messages, f)

        # Add approved feedback
        fb_mgr = FeedbackManager(feedback_dir=self.root_dir / "data" / "feedback")
        fb_mgr.submit_feedback(
            model_name="message_model",
            model_version="v1.0.0",
            prediction_id="p1",
            user_feedback="incorrect",
            input_type="message",
            predicted_label="safe",
            corrected_label="scam",
            text_or_url="Suspicious link inside message click here",
        )

        # Register initial v1.0.0 Production champion
        self.registry = ModelRegistry(models_dir=self.root_dir / "models")
        artifacts_v1 = Path(self.test_dir) / "artifacts_v1"
        artifacts_v1.mkdir(parents=True, exist_ok=True)
        with open(artifacts_v1 / "model.json", "w", encoding="utf-8") as f:
            json.dump({"weights": [0.1]}, f)

        self.registry.register_model(
            model_name="message_model",
            artifacts_dir=artifacts_v1,
            metrics={"f1": 0.88, "accuracy": 0.90, "precision": 0.86, "recall": 0.87},
            parameters={},
            version="v1.0.0",
            status="Production",
        )

        self.retrain_pipe = RetrainPipeline(root_dir=self.root_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_controlled_retraining_lifecycle(self):
        res = self.retrain_pipe.retrain_model(
            model_name="message_model",
            new_dataset_version="v1.1.0",
            new_model_version="v1.1.0",
            include_feedback=True,
            auto_promote_if_valid=True,
        )

        self.assertEqual(res["model_name"], "message_model")
        self.assertEqual(res["dataset_version"], "v1.1.0")
        self.assertEqual(res["model_version"], "v1.1.0")
        self.assertGreater(res["feedback_samples_added"], 0)
        self.assertTrue(res["is_valid"])
        self.assertTrue(res["promoted_to_production"])
        self.assertEqual(res["final_stage_status"], "Production")

        # Verify active production model in registry is updated to v1.1.0
        _, active_meta = self.registry.get_active_model("message_model")
        self.assertEqual(active_meta["version"], "v1.1.0")


if __name__ == "__main__":
    unittest.main()
