"""
message_pipeline.py
-------------------
End-to-end preprocessing & feature extraction pipeline for Message Scam Classifier.
Handles raw message ingestion, null cleaning, text normalization, linguistic & risk
cue extraction, label mapping, and deterministic dataset splitting.
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base_pipeline import BaseDataPipeline
from .text_cleaner import clean_text, extract_urls, extract_phone_numbers


class MessagePipeline(BaseDataPipeline):
    """Preprocessing and feature extraction pipeline for binary scam messages."""

    URGENCY_KEYWORDS = [
        "urgent", "immediately", "expire", "suspended", "blocked",
        "action required", "within 24 hours", "deactivated", "alert",
    ]

    FINANCIAL_KEYWORDS = [
        "otp", "pin", "password", "bank", "account", "kyc",
        "lottery", "winner", "prize", "reward", "cash", "refund",
    ]

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config=config)
        cfg = self.config or {}
        prep_cfg = cfg.get("preprocessing", {})

        self.lowercase = prep_cfg.get("lowercase", True)
        self.normalize_urls = prep_cfg.get("normalize_urls", True)
        self.normalize_phones = prep_cfg.get("normalize_phones", True)
        self.min_text_length = prep_cfg.get("min_text_length", 3)
        self.urgency_keywords = prep_cfg.get("urgency_keywords", self.URGENCY_KEYWORDS)
        self.financial_keywords = prep_cfg.get("financial_keywords", self.FINANCIAL_KEYWORDS)

        self.label_mapping = {"safe": 0, "scam": 1}

    def clean_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filters out missing text, invalid data types, or empty messages."""
        cleaned: List[Dict[str, Any]] = []
        for r in records:
            if not isinstance(r, dict):
                continue
            text = r.get("text")
            if not isinstance(text, str):
                continue
            text_stripped = text.strip()
            if len(text_stripped) < self.min_text_length:
                continue

            item = dict(r)
            item["text"] = text_stripped
            cleaned.append(item)
        return cleaned

    def extract_features_single(self, text: str) -> Dict[str, Any]:
        """Extracts numerical & categorical feature signals from a single message text."""
        cleaned = clean_text(
            text,
            lowercase=self.lowercase,
            normalize_urls=self.normalize_urls,
            normalize_phones=self.normalize_phones,
        )
        urls = extract_urls(text)
        phones = extract_phone_numbers(text)
        lower = text.lower()

        length = len(text)
        words = text.split()
        word_count = len(words)
        uppercase_chars = sum(1 for c in text if c.isupper())
        uppercase_ratio = round(uppercase_chars / max(1, length), 4)

        has_urgency = 1 if any(kw in lower for kw in self.urgency_keywords) else 0
        has_financial = 1 if any(kw in lower for kw in self.financial_keywords) else 0

        return {
            "cleaned_text": cleaned,
            "raw_text": text,
            "text_length": length,
            "word_count": word_count,
            "num_urls": len(urls),
            "num_phones": len(phones),
            "uppercase_ratio": uppercase_ratio,
            "has_urgency_cue": has_urgency,
            "has_financial_cue": has_financial,
        }

    def extract_features(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extracts NLP and tabular risk features across all records."""
        features_list: List[Dict[str, Any]] = []
        for r in records:
            feat = self.extract_features_single(r["text"])
            # Carry over original identifiers and labels
            if "id" in r:
                feat["id"] = r["id"]

            raw_label = r.get("label")
            if raw_label is not None:
                lbl_str = str(raw_label).lower().strip()
                if lbl_str in self.label_mapping:
                    feat["label"] = self.label_mapping[lbl_str]
                    feat["label_name"] = lbl_str
                elif "target" in r:
                    feat["label"] = int(r["target"])
                    feat["label_name"] = "scam" if feat["label"] == 1 else "safe"
                else:
                    feat["label"] = 1 if lbl_str in ["1", "true", "scam", "spam", "danger", "warning"] else 0
                    feat["label_name"] = "scam" if feat["label"] == 1 else "safe"
            elif "target" in r:
                feat["label"] = int(r["target"])
                feat["label_name"] = "scam" if feat["label"] == 1 else "safe"

            features_list.append(feat)
        return features_list

    def transform_inference(self, raw_input: str) -> Dict[str, Any]:
        """Transforms a raw string message into the standard inference representation."""
        if not isinstance(raw_input, str):
            raw_input = ""
        return self.extract_features_single(raw_input)

    def get_config(self) -> Dict[str, Any]:
        """Serializes preprocessing parameters."""
        return {
            "pipeline_class": self.__class__.__name__,
            "pipeline_type": "messages",
            "created_at": self.created_at,
            "preprocessing": {
                "lowercase": self.lowercase,
                "normalize_urls": self.normalize_urls,
                "normalize_phones": self.normalize_phones,
                "min_text_length": self.min_text_length,
                "urgency_keywords": self.urgency_keywords,
                "financial_keywords": self.financial_keywords,
            },
            "label_mapping": self.label_mapping,
            "feature_names": [
                "cleaned_text", "text_length", "word_count",
                "num_urls", "num_phones", "uppercase_ratio",
                "has_urgency_cue", "has_financial_cue",
            ],
        }

    @classmethod
    def from_config(cls, config_path_or_dict: str | Path | Dict[str, Any]) -> "MessagePipeline":
        """Reconstructs the MessagePipeline instance from config."""
        if isinstance(config_path_or_dict, (str, Path)):
            with open(config_path_or_dict, "r", encoding="utf-8-sig") as f:
                cfg = json.load(f)
        else:
            cfg = config_path_or_dict
        return cls(config=cfg)


# Alias for backward compatibility
class MessagePreprocessor(MessagePipeline):
    """Backward-compatible alias for existing code."""

    def transform_single(self, text: str) -> str:
        return self.extract_features_single(text)["cleaned_text"]

    def transform_batch(self, texts: List[str]) -> List[str]:
        return [self.transform_single(t) for t in texts]
