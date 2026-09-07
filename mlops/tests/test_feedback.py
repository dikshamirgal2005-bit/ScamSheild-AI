"""
test_feedback.py
----------------
Unit tests for ScamShield AI User Feedback Loop System and Retraining Dataset Export.
"""
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

from serving.app import create_app
from src.common.feedback import FeedbackManager


class TestFeedbackLoop(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.feedback_dir = Path(self.test_dir) / "feedback"
        self.mgr = FeedbackManager(feedback_dir=self.feedback_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_submit_correct_feedback(self):
        entry = self.mgr.submit_feedback(
            model_name="message_model",
            model_version="v1.0.0",
            prediction_id="pred_123",
            user_feedback="correct",
            input_type="message",
            predicted_label="danger",
            text_or_url="Urgent bank update required!",
        )

        self.assertEqual(entry["user_feedback"], "correct")
        self.assertEqual(entry["target_label"], "danger")
        self.assertEqual(entry["status"], "approved")
        self.assertTrue(entry["ready_for_training"])

    def test_submit_incorrect_feedback(self):
        entry = self.mgr.submit_feedback(
            model_name="url_model",
            model_version="v1.0.0",
            prediction_id="pred_456",
            user_feedback="incorrect",
            input_type="url",
            predicted_label="malicious",
            corrected_label="safe",
            text_or_url="http://legit-school.edu",
        )

        self.assertEqual(entry["user_feedback"], "incorrect")
        self.assertEqual(entry["target_label"], "safe")
        self.assertEqual(entry["status"], "pending_review")
        self.assertTrue(entry["ready_for_training"])

    def test_summary_and_export(self):
        # Submit 1 correct, 1 incorrect
        self.mgr.submit_feedback(
            model_name="scam_type_model",
            model_version="v1.0.0",
            prediction_id="p1",
            user_feedback="correct",
            input_type="scam_type",
            predicted_label="job_recruitment",
            text_or_url="Work from home $500 daily",
        )
        self.mgr.submit_feedback(
            model_name="scam_type_model",
            model_version="v1.0.0",
            prediction_id="p2",
            user_feedback="incorrect",
            input_type="scam_type",
            predicted_label="phishing",
            corrected_label="investment_crypto",
            text_or_url="Buy bitcoin crypto now",
        )

        summary = self.mgr.get_feedback_summary()
        self.assertEqual(summary["total_feedback_submissions"], 2)
        self.assertEqual(summary["total_correct"], 1)
        self.assertEqual(summary["total_incorrect"], 1)
        self.assertEqual(summary["overall_accuracy_rate"], 0.5)

        # Export prepared retraining dataset
        export_res = self.mgr.export_retraining_dataset(model_name="scam_type_model")
        self.assertEqual(export_res["exported_samples"], 2)
        self.assertTrue(Path(export_res["output_path"]).exists())

    def test_feedback_api_endpoints(self):
        app = create_app()
        client = TestClient(app)

        # 1. Post feedback
        payload = {
            "prediction_id": "pred_test_789",
            "model_name": "message_model",
            "model_version": "v1.0.0",
            "user_feedback": "correct",
            "input_type": "message",
            "predicted_label": "danger",
            "text_or_url": "Win cash now",
        }
        r_fb = client.post("/api/v1/feedback", json=payload)
        self.assertEqual(r_fb.status_code, 200)
        self.assertIn("feedback_id", r_fb.json())

        # 2. Get summary
        r_sum = client.get("/api/v1/feedback/summary")
        self.assertEqual(r_sum.status_code, 200)
        self.assertIn("total_feedback_submissions", r_sum.json())

        # 3. Post export
        r_exp = client.post("/api/v1/feedback/export", json={"model_name": "message_model"})
        self.assertEqual(r_exp.status_code, 200)
        self.assertIn("exported_samples", r_exp.json())


if __name__ == "__main__":
    unittest.main()
