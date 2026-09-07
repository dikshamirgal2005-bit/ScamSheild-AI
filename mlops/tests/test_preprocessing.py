"""
test_preprocessing.py
---------------------
Unit tests for text cleaning and URL feature extraction.
"""
import unittest

from src.preprocessing.text_cleaner import clean_text, extract_urls, extract_phone_numbers
from src.preprocessing.url_features import URLExtractor


class TestPreprocessing(unittest.TestCase):
    def test_clean_text_lowercasing_and_spaces(self):
        raw = "   URGENT! Please   check   your   account!   "
        cleaned = clean_text(raw)
        self.assertEqual(cleaned, "urgent! please check your account!")

    def test_clean_text_url_and_phone_masking(self):
        raw = "Click https://phish-bank.com or call 123-456-7890 now!"
        cleaned = clean_text(raw)
        self.assertIn("[URL]", cleaned)
        self.assertIn("[PHONE]", cleaned)
        self.assertNotIn("https://phish-bank.com", cleaned)
        self.assertNotIn("123-456-7890", cleaned)

    def test_extract_urls(self):
        text = "Check out https://example.com/login and http://test.org for info."
        urls = extract_urls(text)
        self.assertEqual(len(urls), 2)
        self.assertIn("https://example.com/login", urls)
        self.assertIn("http://test.org", urls)

    def test_extract_phone_numbers(self):
        text = "Contact support at +1-800-555-0199 or (555) 123-4567 immediately."
        phones = extract_phone_numbers(text)
        self.assertGreaterEqual(len(phones), 1)

    def test_url_features_extractor(self):
        extractor = URLExtractor()
        features = extractor.extract_features("http://192.168.1.1/login.php?update=true")

        self.assertIsInstance(features, dict)
        self.assertEqual(features["is_ip"], 1)
        self.assertEqual(features["has_login_keyword"], 1)
        self.assertGreater(features["entropy"], 0.0)
        self.assertIn("url_length", features)
        self.assertIn("has_suspicious_tld", features)

    def test_url_features_suspicious_tld(self):
        extractor = URLExtractor()
        features = extractor.extract_features("http://claim-free-bonus.xyz")
        self.assertEqual(features["has_suspicious_tld"], 1)
        self.assertEqual(features["is_ip"], 0)


if __name__ == "__main__":
    unittest.main()
