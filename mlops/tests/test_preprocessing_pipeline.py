"""
test_preprocessing_pipeline.py
------------------------------
Unit tests for ScamShield AI reusable preprocessing and feature extraction pipelines.
"""
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from src.preprocessing.message_pipeline import MessagePipeline
from src.preprocessing.scam_type_pipeline import ScamTypePipeline
from src.preprocessing.url_pipeline import URLPipeline


class TestPreprocessingPipelines(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()

        # Sample message data including edge cases (null text, empty text)
        self.message_data = [
            {"id": "1", "text": "URGENT! Account suspended. Click http://scam.com now!", "label": "scam"},
            {"id": "2", "text": "Hey Rahul, let's catch up for lunch today.", "label": "safe"},
            {"id": "3", "text": "Winner! Claim cash reward Rs 50,000 immediately.", "label": "scam"},
            {"id": "4", "text": "Your OTP for login is 123456.", "label": "safe"},
            {"id": "5", "text": None, "label": "safe"},  # Should be cleaned out
            {"id": "6", "text": "   ", "label": "scam"},   # Should be cleaned out
        ]
        self.message_file = Path(self.test_dir) / "test_messages.json"
        with open(self.message_file, "w", encoding="utf-8") as f:
            json.dump(self.message_data, f)

        # Sample scam type data
        self.scam_type_data = [
            {"id": "1", "text": "Verify your bank KYC details at http://phish.xyz", "category": "phishing"},
            {"id": "2", "text": "Urgent call from customer care representative", "category": "vishing"},
            {"id": "3", "text": "Earn 5000 daily with part-time work from home", "category": "job_recruitment"},
            {"id": "4", "text": None, "category": "phishing"},  # Should be cleaned out
        ]
        self.scam_type_file = Path(self.test_dir) / "test_scam_types.json"
        with open(self.scam_type_file, "w", encoding="utf-8") as f:
            json.dump(self.scam_type_data, f)

        # Sample URL data
        self.url_data = [
            {"url": "http://192.168.1.1/banking-login", "status": "danger"},
            {"url": "https://google.com/search?q=test", "status": "safe"},
            {"url": "http://free-bonus-claim.xyz", "status": "warning"},
            {"url": "invalid_no_dot", "status": "safe"},  # Should be cleaned out
            {"url": None, "status": "danger"},            # Should be cleaned out
        ]
        self.url_file = Path(self.test_dir) / "test_urls.json"
        with open(self.url_file, "w", encoding="utf-8") as f:
            json.dump(self.url_data, f)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_message_pipeline_cleaning_and_features(self):
        pipeline = MessagePipeline()
        records = pipeline.load_data(self.message_file)
        self.assertEqual(len(records), 6)

        cleaned = pipeline.clean_records(records)
        self.assertEqual(len(cleaned), 4)  # 2 null/empty rows removed

        features = pipeline.extract_features(cleaned)
        self.assertEqual(len(features), 4)

        # Verify extracted signals on first scam record
        scam_sample = features[0]
        self.assertEqual(scam_sample["label"], 1)
        self.assertEqual(scam_sample["has_urgency_cue"], 1)
        self.assertEqual(scam_sample["num_urls"], 1)
        self.assertIn("[URL]", scam_sample["cleaned_text"])
        self.assertGreater(scam_sample["uppercase_ratio"], 0.0)

    def test_message_pipeline_config_and_inference(self):
        pipeline = MessagePipeline()
        config_path = Path(self.test_dir) / "msg_config.json"
        pipeline.save_config(config_path)
        self.assertTrue(config_path.exists())

        loaded_pipeline = MessagePipeline.from_config(config_path)
        self.assertEqual(loaded_pipeline.lowercase, pipeline.lowercase)

        # Test inference transformation
        inference_out = loaded_pipeline.transform_inference("URGENT: Call 9876543210 immediately")
        self.assertIn("cleaned_text", inference_out)
        self.assertEqual(inference_out["has_urgency_cue"], 1)
        self.assertEqual(inference_out["num_phones"], 1)

    def test_scam_type_pipeline_encoding_and_config(self):
        pipeline = ScamTypePipeline()
        records = pipeline.load_data(self.scam_type_file)
        cleaned = pipeline.clean_records(records)
        self.assertEqual(len(cleaned), 3)

        features = pipeline.extract_features(cleaned)
        self.assertEqual(len(features), 3)

        # Check label encoding
        phishing_id = pipeline.encode_label("phishing")
        self.assertEqual(features[0]["label"], phishing_id)
        self.assertEqual(pipeline.decode_label(phishing_id), "phishing")

        # Config save and restore
        cfg_path = Path(self.test_dir) / "scam_type_config.json"
        pipeline.save_config(cfg_path)
        restored = ScamTypePipeline.from_config(cfg_path)
        self.assertEqual(restored.categories, pipeline.categories)

    def test_url_pipeline_cleaning_features_and_stats(self):
        pipeline = URLPipeline()
        records = pipeline.load_data(self.url_file)
        cleaned = pipeline.clean_records(records)
        self.assertEqual(len(cleaned), 3)  # 2 invalid records dropped

        features = pipeline.extract_features(cleaned)
        self.assertEqual(len(features), 3)

        # Verify IP detection and features
        ip_sample = [f for f in features if "192.168" in f["url"]][0]
        self.assertEqual(ip_sample["is_ip"], 1)
        self.assertEqual(ip_sample["label"], 2)  # danger

        # Verify statistical bounds calculated
        self.assertIn("entropy", pipeline.feature_stats)
        self.assertIn("mean", pipeline.feature_stats["entropy"])

        # Test inference transformation
        inference_out = pipeline.transform_inference("http://bad-site.xyz/login")
        self.assertIn("features", inference_out)
        self.assertEqual(inference_out["features"]["has_suspicious_tld"], 1)

    def test_deterministic_split_reproducibility(self):
        pipeline = MessagePipeline()
        records = [{"text": f"Message number {i}", "label": "safe"} for i in range(20)]

        split1 = pipeline.split_data(records, train_ratio=0.7, val_ratio=0.15, test_ratio=0.15, seed=99)
        split2 = pipeline.split_data(records, train_ratio=0.7, val_ratio=0.15, test_ratio=0.15, seed=99)

        self.assertEqual(
            [r["text"] for r in split1["train"]],
            [r["text"] for r in split2["train"]],
        )
        self.assertEqual(
            [r["text"] for r in split1["test"]],
            [r["text"] for r in split2["test"]],
        )

    def test_pipeline_run_workflow(self):
        pipeline = MessagePipeline()
        out_dir = Path(self.test_dir) / "processed_output"
        res = pipeline.run(self.message_file, output_dir=out_dir)

        self.assertEqual(res["cleaned_count"], 4)
        self.assertTrue((out_dir / "train.json").exists())
        self.assertTrue((out_dir / "val.json").exists())
        self.assertTrue((out_dir / "test.json").exists())
        self.assertTrue((out_dir / "preprocessor_config.json").exists())


if __name__ == "__main__":
    unittest.main()
