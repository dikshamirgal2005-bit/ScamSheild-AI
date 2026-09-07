"""
test_training_pipeline.py
-------------------------
Unit tests for ScamShield AI independent model training pipelines and versioning.
"""
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from src.training.train_message import MessageTrainer
from src.training.train_scam_type import ScamTypeTrainer
from src.training.train_url import URLTrainer
from src.common.registry import ModelRegistry


class TestTrainingPipeline(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.models_dir = Path(self.test_dir) / "models"

        # Create mock training data for tests
        self.msg_data_file = Path(self.test_dir) / "mock_messages.json"
        with open(self.msg_data_file, "w", encoding="utf-8") as f:
            json.dump([
                {"text": "Urgent lottery prize won", "label": 1},
                {"text": "Hey dinner tonight?", "label": 0},
            ], f)

        self.scam_data_file = Path(self.test_dir) / "mock_scam_types.json"
        with open(self.scam_data_file, "w", encoding="utf-8") as f:
            json.dump([
                {"text": "Fake job offer telegram", "category": "job_recruitment"},
                {"text": "Bank account KYC alert", "category": "phishing"},
            ], f)

        self.url_data_file = Path(self.test_dir) / "mock_urls.json"
        with open(self.url_data_file, "w", encoding="utf-8") as f:
            json.dump([
                {"url": "http://evil-phish.xyz", "status": "danger"},
                {"url": "https://trusted-site.com", "status": "safe"},
            ], f)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_message_trainer_lifecycle(self):
        config = {
            "training": {"epochs": 3, "learning_rate": 0.001, "version": "v1.0.0"},
            "paths": {"train_data": str(self.msg_data_file)},
        }
        trainer = MessageTrainer(config=config, version="v1.0.0", models_dir=str(self.models_dir))
        results = trainer.run()

        self.assertEqual(results["model_name"], "message_model")
        self.assertEqual(results["version"], "v1.0.0")
        self.assertIn("val_f1", results["metrics"])
        self.assertIn("train_accuracy", results["metrics"])

        # Check saved files
        artifact_dir = Path(results["artifacts_dir"])
        self.assertTrue((artifact_dir / "model.json").exists())
        self.assertTrue((artifact_dir / "training_config.json").exists())
        self.assertTrue((artifact_dir / "metadata.json").exists())

        # Check training config contents
        with open(artifact_dir / "training_config.json", "r", encoding="utf-8") as f:
            saved_cfg = json.load(f)
        self.assertEqual(saved_cfg["training"]["epochs"], 3)

        # Check ModelRegistry
        registry = ModelRegistry(models_dir=str(self.models_dir))
        models = registry.list_models("message_model")
        self.assertEqual(len(models), 1)
        self.assertEqual(models[0]["version"], "v1.0.0")

    def test_scam_type_trainer_lifecycle(self):
        config = {
            "training": {"epochs": 4, "learning_rate": 0.0005, "version": "v1.0.0"},
            "paths": {"train_data": str(self.scam_data_file)},
        }
        trainer = ScamTypeTrainer(config=config, version="v1.0.0", models_dir=str(self.models_dir))
        results = trainer.run()

        self.assertEqual(results["model_name"], "scam_type_model")
        self.assertIn("macro_f1", results["metrics"])
        self.assertIn("top_3_accuracy", results["metrics"])

        artifact_dir = Path(results["artifacts_dir"])
        self.assertTrue((artifact_dir / "model.json").exists())
        self.assertTrue((artifact_dir / "label_encoder.json").exists())
        self.assertTrue((artifact_dir / "training_config.json").exists())

    def test_url_trainer_lifecycle(self):
        config = {
            "training": {"n_estimators": 50, "version": "v1.0.0"},
            "paths": {"train_data": str(self.url_data_file)},
        }
        trainer = URLTrainer(config=config, version="v1.0.0", models_dir=str(self.models_dir))
        results = trainer.run()

        self.assertEqual(results["model_name"], "url_model")
        self.assertIn("accuracy", results["metrics"])
        self.assertIn("roc_auc", results["metrics"])

        artifact_dir = Path(results["artifacts_dir"])
        self.assertTrue((artifact_dir / "model.json").exists())
        self.assertTrue((artifact_dir / "feature_names.json").exists())
        self.assertTrue((artifact_dir / "training_config.json").exists())

    def test_version_isolation(self):
        trainer_v1 = MessageTrainer(version="v1.0.0", models_dir=str(self.models_dir))
        trainer_v1.run()

        trainer_v2 = MessageTrainer(version="v2.0.0", models_dir=str(self.models_dir))
        trainer_v2.run()

        registry = ModelRegistry(models_dir=str(self.models_dir))
        models = registry.list_models("message_model")
        self.assertEqual(len(models), 2)
        versions = [m["version"] for m in models]
        self.assertIn("v1.0.0", versions)
        self.assertIn("v2.0.0", versions)


if __name__ == "__main__":
    unittest.main()
