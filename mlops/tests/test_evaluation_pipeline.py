"""
test_evaluation_pipeline.py
---------------------------
Unit tests for ScamShield AI automated model evaluation pipelines and scorecards.
"""
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from src.training.train_message import MessageTrainer
from src.training.train_scam_type import ScamTypeTrainer
from src.training.train_url import URLTrainer
from src.evaluation.evaluate_message import MessageEvaluator
from src.evaluation.evaluate_scam_type import ScamTypeEvaluator
from src.evaluation.evaluate_url import URLEvaluator


class TestEvaluationPipeline(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.models_dir = Path(self.test_dir) / "models"

        # Mock test dataset files
        self.msg_test_file = Path(self.test_dir) / "test_messages.json"
        with open(self.msg_test_file, "w", encoding="utf-8") as f:
            json.dump([
                {"text": "URGENT: Bank account deactivated. Update KYC now!", "label": 1},
                {"text": "Hey Rahul, let's catch up for lunch today.", "label": 0},
            ], f)

        self.scam_test_file = Path(self.test_dir) / "test_scam_types.json"
        with open(self.scam_test_file, "w", encoding="utf-8") as f:
            json.dump([
                {"text": "Fake job offer on Telegram", "category": "job_recruitment"},
                {"text": "Bank account KYC update alert", "category": "phishing"},
            ], f)

        self.url_test_file = Path(self.test_dir) / "test_urls.json"
        with open(self.url_test_file, "w", encoding="utf-8") as f:
            json.dump([
                {"url": "http://192.168.1.1/banking-login", "status": "danger"},
                {"url": "https://google.com/search?q=test", "status": "safe"},
            ], f)

        # Train baseline models v1.0.0 in test directory
        msg_trainer = MessageTrainer(version="v1.0.0", models_dir=str(self.models_dir))
        msg_trainer.run()

        scam_trainer = ScamTypeTrainer(version="v1.0.0", models_dir=str(self.models_dir))
        scam_trainer.run()

        url_trainer = URLTrainer(version="v1.0.0", models_dir=str(self.models_dir))
        url_trainer.run()

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_evaluate_message_model(self):
        evaluator = MessageEvaluator(models_dir=str(self.models_dir))
        results = evaluator.evaluate_version(version="v1.0.0", data_path=str(self.msg_test_file))

        self.assertEqual(results["model_name"], "message_model")
        self.assertEqual(results["version"], "v1.0.0")
        self.assertEqual(results["status"], "evaluated")
        self.assertIn("accuracy", results["metrics"])
        self.assertIn("f1", results["metrics"])
        self.assertIn("matrix", results["confusion_matrix"])

        # Check evaluation_results.json file existence
        out_file = self.models_dir / "message_model" / "v1.0.0" / "evaluation_results.json"
        self.assertTrue(out_file.exists())

    def test_evaluate_scam_type_model(self):
        evaluator = ScamTypeEvaluator(models_dir=str(self.models_dir))
        results = evaluator.evaluate_version(version="v1.0.0", data_path=str(self.scam_test_file))

        self.assertEqual(results["model_name"], "scam_type_model")
        self.assertEqual(results["version"], "v1.0.0")
        self.assertIn("macro_f1", results["metrics"])
        self.assertIn("accuracy", results["metrics"])
        self.assertIn("matrix", results["confusion_matrix"])

        out_file = self.models_dir / "scam_type_model" / "v1.0.0" / "evaluation_results.json"
        self.assertTrue(out_file.exists())

    def test_evaluate_url_model(self):
        evaluator = URLEvaluator(models_dir=str(self.models_dir))
        results = evaluator.evaluate_version(version="v1.0.0", data_path=str(self.url_test_file))

        self.assertEqual(results["model_name"], "url_model")
        self.assertEqual(results["version"], "v1.0.0")
        self.assertIn("accuracy", results["metrics"])
        self.assertIn("f1", results["metrics"])

        out_file = self.models_dir / "url_model" / "v1.0.0" / "evaluation_results.json"
        self.assertTrue(out_file.exists())


if __name__ == "__main__":
    unittest.main()
