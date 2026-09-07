import unittest
from unittest.mock import Mock, patch

from src.inference.url_live_checker import LiveURLChecker


class TestLiveURLChecker(unittest.TestCase):
    @patch("src.inference.url_live_checker.requests.Session.get")
    @patch("src.inference.url_live_checker.socket.getaddrinfo")
    def test_trusted_domain_reachable(self, mock_dns, mock_get):
        mock_dns.return_value = [(None, None, None, None, ("142.250.72.14", 0))]
        response = Mock()
        response.status_code = 200
        response.url = "https://www.google.com/"
        response.history = []
        response.is_redirect = False
        response.is_permanent_redirect = False
        response.headers = {}
        response.close.return_value = None
        mock_get.return_value = response

        result = LiveURLChecker().check("https://www.google.com")
        self.assertTrue(result["checked"])
        self.assertTrue(result["reachable"])
        self.assertTrue(result["dnsResolved"])
        self.assertTrue(result["trustedDomain"])
        self.assertEqual(result["httpStatus"], 200)

    @patch("src.inference.url_live_checker.socket.getaddrinfo")
    def test_private_ip_is_rejected(self, mock_dns):
        mock_dns.return_value = [(None, None, None, None, ("192.168.1.10", 0))]
        result = LiveURLChecker().check("https://example.test")
        self.assertFalse(result["reachable"])
        self.assertIn("private", result["error"])


if __name__ == "__main__":
    unittest.main()

class TestTrustedDomainRisk(unittest.TestCase):
    @patch("src.inference.url_predictor.LiveURLChecker.check")
    def test_trusted_reachable_domain_gets_minimal_risk(self, mock_check):
        from src.inference.url_predictor import URLPredictor
        import tempfile
        from pathlib import Path
        import json
        from src.common.registry import ModelRegistry

        with tempfile.TemporaryDirectory() as tmp:
            models = Path(tmp) / "models"
            artifacts = Path(tmp) / "artifacts"
            artifacts.mkdir()
            (artifacts / "model.json").write_text(json.dumps({"weights": [0.1]}), encoding="utf-8")
            registry = ModelRegistry(models_dir=models)
            registry.register_model("url_model", artifacts, {}, {}, "v1.0.0", "Production")
            mock_check.return_value = {
                "checked": True, "reachable": True, "dnsResolved": True,
                "httpsValid": True, "httpStatus": 200, "finalUrl": "https://www.google.com/",
                "finalDomain": "www.google.com", "redirects": 0,
                "trustedDomain": True, "error": None,
            }
            result = URLPredictor(models_dir=models).predict("https://www.google.com")
            self.assertEqual(result["riskScore"], 1)
            self.assertEqual(result["status"], "safe")
            self.assertIn("liveCheck", result)
