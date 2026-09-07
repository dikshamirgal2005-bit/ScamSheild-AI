"""
test_config.py
--------------
Unit tests verifying config files existence and structure.
"""
import unittest
from pathlib import Path

from src.common.config_loader import load_config


class TestConfigs(unittest.TestCase):
    def setUp(self):
        # Anchor relative to mlops directory
        self.mlops_dir = Path(__file__).resolve().parent.parent
        self.configs_dir = self.mlops_dir / "configs"

    def test_config_files_exist(self):
        expected_configs = [
            "base_config.yaml",
            "message_model.yaml",
            "scam_type_model.yaml",
            "url_model.yaml",
            "serving_config.yaml",
        ]
        for cfg in expected_configs:
            cfg_path = self.configs_dir / cfg
            self.assertTrue(cfg_path.exists(), f"Missing config file: {cfg}")

    def test_load_config_functionality(self):
        msg_cfg_path = str(self.configs_dir / "message_model.yaml")
        base_cfg_path = str(self.configs_dir / "base_config.yaml")

        try:
            import yaml
            cfg = load_config(msg_cfg_path, base_config_path=base_cfg_path)
            self.assertIsInstance(cfg, dict)
            self.assertIn("model", cfg)
            self.assertIn("name", cfg["model"])
            self.assertEqual(cfg["model"]["name"], "scamshield-message-classifier")
        except ImportError:
            # If pyyaml is not installed in the test runner environment
            cfg = load_config(msg_cfg_path, base_config_path=base_cfg_path)
            self.assertEqual(cfg, {})


if __name__ == "__main__":
    unittest.main()
