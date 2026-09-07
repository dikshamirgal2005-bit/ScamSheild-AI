"""
test_monitoring.py
-------------------
Unit tests for ScamShield AI Prediction Monitoring System and Privacy Anonymization.
"""
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

from serving.app import create_app
from src.common.monitor import PredictionMonitor


class TestPredictionMonitor(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.log_dir = Path(self.test_dir) / "logs"
        self.monitor = PredictionMonitor(log_dir=self.log_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_log_prediction_anonymization(self):
        sensitive_text = "My secret password is 12345! Call me at 555-0199."
        pred_result = {
            "riskScore": 85,
            "status": "danger",
            "probability": 0.85,
            "scamType": "Phishing",
        }

        record = self.monitor.log_prediction(
            input_type="message",
            model_name="message_model",
            model_version="v1.0.0",
            prediction_result=pred_result,
            raw_input=sensitive_text,
            execution_time_ms=12.5,
        )

        # Ensure raw text is NOT stored in the record
        self.assertNotIn("sensitive_text", record)
        self.assertNotIn("password", json.dumps(record))
        self.assertIn("anonymized_hash", record)
        self.assertEqual(record["input_length"], len(sensitive_text.strip()))
        self.assertEqual(record["risk_score"], 85)
        self.assertEqual(record["status"], "danger")

    def test_summary_stats_computation(self):
        self.monitor.log_prediction(
            input_type="message",
            model_name="message_model",
            model_version="v1.0.0",
            prediction_result={"riskScore": 90, "status": "danger", "probability": 0.90},
            raw_input="Scam text 1",
            execution_time_ms=10.0,
        )
        self.monitor.log_prediction(
            input_type="url",
            model_name="url_model",
            model_version="v1.0.0",
            prediction_result={"riskScore": 10, "status": "safe"},
            raw_input="http://safe.com",
            execution_time_ms=5.0,
        )

        stats = self.monitor.get_summary_stats()
        self.assertEqual(stats["total_predictions"], 2)
        self.assertEqual(stats["avg_risk_score"], 50.0)
        self.assertIn("message_model", stats["models_monitored"])
        self.assertIn("url_model", stats["models_monitored"])
        self.assertIn("danger", stats["status_distribution"])
        self.assertIn("safe", stats["status_distribution"])

    def test_monitoring_endpoint(self):
        app = create_app()
        client = TestClient(app)

        response = client.get("/api/v1/monitoring/stats")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_predictions", data)
        self.assertIn("avg_risk_score", data)
        self.assertIn("privacy_notice", data)


if __name__ == "__main__":
    unittest.main()
