"""
test_dataset_registry.py
------------------------
Unit tests for the Dataset Version Management System in ScamShield AI.
"""
import csv
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from src.common.dataset_registry import DatasetRegistry


class TestDatasetRegistry(unittest.TestCase):
    def setUp(self):
        # Create a temporary directory for tests to keep test runs isolated
        self.test_dir = tempfile.mkdtemp()
        self.versions_dir = Path(self.test_dir) / "versions"
        self.registry = DatasetRegistry(versions_dir=self.versions_dir)

        # Create temporary sample JSON dataset
        self.sample_json = Path(self.test_dir) / "sample.json"
        self.json_data = [
            {"id": "1", "text": "Win free money now!", "label": "scam"},
            {"id": "2", "text": "Are you coming over?", "label": "safe"},
            {"id": "3", "text": "Verify your bank KYC", "label": "scam"},
        ]
        with open(self.sample_json, "w", encoding="utf-8") as f:
            json.dump(self.json_data, f)

        # Create temporary sample CSV dataset
        self.sample_csv = Path(self.test_dir) / "sample.csv"
        with open(self.sample_csv, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["url", "entropy", "label"])
            writer.writeheader()
            writer.writerow({"url": "http://evil.xyz", "entropy": "4.5", "label": "malicious"})
            writer.writerow({"url": "https://google.com", "entropy": "2.1", "label": "safe"})

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_register_json_dataset_metadata(self):
        meta = self.registry.register_dataset(
            dataset_name="test_messages",
            file_path=self.sample_json,
            version="v1.0.0",
            label_column="label",
            description="Test messages dataset",
        )

        self.assertEqual(meta["dataset_name"], "test_messages")
        self.assertEqual(meta["version"], "v1.0.0")
        self.assertEqual(meta["num_records"], 3)
        self.assertIn("text", meta["features"])
        self.assertNotIn("label", meta["features"])
        self.assertEqual(meta["label_column"], "label")
        self.assertIn("scam", meta["labels"]["distribution"])
        self.assertEqual(meta["labels"]["distribution"]["scam"], 2)
        self.assertEqual(meta["labels"]["distribution"]["safe"], 1)
        self.assertIsInstance(meta["checksum_sha256"], str)
        self.assertEqual(len(meta["checksum_sha256"]), 64)
        self.assertTrue(Path(meta["file_path"]).exists())

    def test_register_csv_dataset(self):
        meta = self.registry.register_dataset(
            dataset_name="test_urls",
            file_path=self.sample_csv,
            version="v1.0.0",
            label_column="label",
            description="Test CSV URLs",
        )

        self.assertEqual(meta["file_format"], "csv")
        self.assertEqual(meta["num_records"], 2)
        self.assertIn("url", meta["features"])
        self.assertIn("entropy", meta["features"])
        self.assertEqual(meta["labels"]["classes"], ["malicious", "safe"])

    def test_version_progression_and_latest(self):
        # Register v1.0.0
        self.registry.register_dataset(
            dataset_name="test_evolution",
            file_path=self.sample_json,
            version="v1.0.0",
            label_column="label",
        )

        # Register v1.1.0 with new data
        updated_json = Path(self.test_dir) / "sample_v2.json"
        with open(updated_json, "w", encoding="utf-8") as f:
            json.dump(self.json_data + [{"id": "4", "text": "Hi", "label": "safe"}], f)

        self.registry.register_dataset(
            dataset_name="test_evolution",
            file_path=updated_json,
            version="v1.1.0",
            label_column="label",
        )

        # Query latest
        data_file, meta = self.registry.get_dataset("test_evolution", version="latest")
        self.assertEqual(meta["version"], "v1.1.0")
        self.assertEqual(meta["num_records"], 4)

        # Query specific previous version
        _, meta_v1 = self.registry.get_dataset("test_evolution", version="v1.0.0")
        self.assertEqual(meta_v1["version"], "v1.0.0")
        self.assertEqual(meta_v1["num_records"], 3)

    def test_list_datasets(self):
        self.registry.register_dataset(
            dataset_name="dataset_a",
            file_path=self.sample_json,
            version="v1.0.0",
        )
        self.registry.register_dataset(
            dataset_name="dataset_b",
            file_path=self.sample_csv,
            version="v1.0.0",
        )

        all_ds = self.registry.list_datasets()
        self.assertEqual(len(all_ds), 2)
        names = [d["dataset_name"] for d in all_ds]
        self.assertIn("dataset_a", names)
        self.assertIn("dataset_b", names)

    def test_error_handling_non_existent(self):
        with self.assertRaises(KeyError):
            self.registry.get_dataset("non_existent_dataset")

        self.registry.register_dataset(
            dataset_name="test_errors",
            file_path=self.sample_json,
            version="v1.0.0",
        )
        with self.assertRaises(KeyError):
            self.registry.get_dataset("test_errors", version="v9.9.9")


if __name__ == "__main__":
    unittest.main()
