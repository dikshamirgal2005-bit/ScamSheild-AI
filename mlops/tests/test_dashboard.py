"""
test_dashboard.py
-----------------
Unit and integration tests for the ScamShield AI MLOps Monitoring Dashboard.
"""
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

from src.common.dashboard import DashboardService, dashboard_service
from serving.app import create_app


class TestDashboard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(create_app())

    def test_dashboard_service_summary(self):
        summary = dashboard_service.get_dashboard_summary()
        self.assertIn("summary", summary)
        self.assertIn("models", summary)
        self.assertIn("datasets", summary)
        self.assertIn("predictions_telemetry", summary)
        self.assertIn("feedback_statistics", summary)

        s = summary["summary"]
        self.assertGreaterEqual(s["total_models_tracked"], 1)
        self.assertGreaterEqual(s["dataset_versions_count"], 1)

        # Verify model metrics structure
        for m in summary["models"]:
            self.assertIn("model_name", m)
            self.assertIn("version", m)
            self.assertIn("status", m)
            self.assertIn("dataset_version", m)
            self.assertIn("metrics", m)
            metrics = m["metrics"]
            self.assertIn("accuracy", metrics)
            self.assertIn("precision", metrics)
            self.assertIn("recall", metrics)
            self.assertIn("f1", metrics)

    def test_dashboard_service_render_html(self):
        html = dashboard_service.render_html()
        self.assertIsInstance(html, str)
        self.assertIn("ScamShield AI", html)
        self.assertIn("MLOps Monitoring Dashboard", html)
        self.assertIn("Model Registry &amp; Evaluation Scorecards" if "&amp;" in html else "Model Registry & Evaluation Scorecards", html)
        self.assertIn("Dataset Versioning Catalog", html)

    def test_dashboard_api_endpoint(self):
        resp = self.client.get("/api/v1/dashboard/summary")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("models", data)
        self.assertIn("datasets", data)
        self.assertIn("predictions_telemetry", data)

    def test_dashboard_html_endpoint(self):
        resp = self.client.get("/dashboard")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("text/html", resp.headers["content-type"])
        self.assertIn("ScamShield AI", resp.text)


if __name__ == "__main__":
    unittest.main()
