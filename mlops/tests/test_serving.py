"""
test_serving.py
----------------
Unit tests for FastAPI Serving Layer endpoints, health monitoring, and hot-reloading API.
"""
import unittest
from fastapi.testclient import TestClient

from serving.app import create_app
from serving.manager import inference_manager


class TestServingAPI(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = TestClient(self.app)

    def test_healthz_endpoint(self):
        response = self.client.get("/healthz")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("models_loaded", data)
        self.assertIn("active_models", data)

    def test_readiness_endpoint(self):
        response = self.client.get("/ready")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ready"])
        self.assertIn("active_production_models", data)

    def test_scan_message_endpoint(self):
        payload = {"text": "Urgent! Your account is locked. Verify at http://scam-bank.com immediately."}
        response = self.client.post("/api/v1/scan/message", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("riskScore", data)
        self.assertIn("status", data)
        self.assertIn("verdict", data)
        self.assertIn("indicators", data)
        self.assertIn("modelVersion", data)

    def test_categorize_scam_endpoint(self):
        payload = {"text": "Guaranteed 500% profit returns! Invest in Bitcoin crypto trading now."}
        response = self.client.post("/api/v1/scan/scam-type", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("topScamType", data)
        self.assertEqual(data["topScamType"], "investment_crypto")
        self.assertIn("distribution", data)

    def test_scan_url_endpoint(self):
        payload = {"url": "http://192.168.1.1/login"}
        response = self.client.post("/api/v1/scan/url", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("riskScore", data)
        self.assertIn("status", data)
        self.assertIn("flags", data)

    def test_reload_models_endpoint(self):
        response = self.client.post("/api/v1/reload")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("reloaded_models", data)


if __name__ == "__main__":
    unittest.main()
