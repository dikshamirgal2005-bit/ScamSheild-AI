"""
scam_type_pipeline.py
---------------------
End-to-end preprocessing & multi-class label encoding pipeline for 9-Class Scam Taxonomy.
Handles data cleaning, text normalization, category mapping, and dataset partitioning.
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base_pipeline import BaseDataPipeline
from .text_cleaner import clean_text


class ScamTypePipeline(BaseDataPipeline):
    """Preprocessing and label encoding pipeline for 9-class fraud categorization."""

    DEFAULT_CATEGORIES = [
        "phishing",
        "vishing",
        "smishing",
        "lottery_advance_fee",
        "investment_crypto",
        "impersonation",
        "romance_pig_butchering",
        "tech_support",
        "job_recruitment",
    ]

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config=config)
        cfg = self.config or {}
        prep_cfg = cfg.get("preprocessing", {})

        self.lowercase = prep_cfg.get("lowercase", True)
        self.min_text_length = prep_cfg.get("min_text_length", 3)
        self.categories = cfg.get("categories", prep_cfg.get("categories", self.DEFAULT_CATEGORIES))

        self.label2id = {cat: idx for idx, cat in enumerate(self.categories)}
        self.id2label = {idx: cat for idx, cat in enumerate(self.categories)}

    def clean_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filters out missing text or invalid records."""
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
        """Extracts normalized text and basic characteristics for scam type classification."""
        cleaned = clean_text(
            text,
            lowercase=self.lowercase,
            normalize_urls=False,  # preserve domain tokens for category context
            normalize_phones=False,
        )
        return {
            "cleaned_text": cleaned,
            "raw_text": text,
            "text_length": len(text),
            "word_count": len(text.split()),
        }

    def extract_features(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Transforms records with encoded labels and text features."""
        features_list: List[Dict[str, Any]] = []
        for r in records:
            feat = self.extract_features_single(r["text"])
            if "id" in r:
                feat["id"] = r["id"]

            category = r.get("category", r.get("label"))
            if category:
                cat_str = str(category).lower().strip()
                feat["category"] = cat_str
                feat["label"] = self.label2id.get(cat_str, -1)
            else:
                feat["category"] = "unknown"
                feat["label"] = -1

            features_list.append(feat)
        return features_list

    def transform_inference(self, raw_input: str) -> Dict[str, Any]:
        """Inference transformation for a single message."""
        if not isinstance(raw_input, str):
            raw_input = ""
        return self.extract_features_single(raw_input)

    def encode_label(self, category: str) -> int:
        """Converts category string name to integer class ID."""
        return self.label2id.get(category.lower().strip(), -1)

    def decode_label(self, label_id: int) -> str:
        """Converts integer class ID back to category string."""
        return self.id2label.get(label_id, "unknown")

    def get_config(self) -> Dict[str, Any]:
        """Serializes pipeline parameters and category vocabulary."""
        return {
            "pipeline_class": self.__class__.__name__,
            "pipeline_type": "scam_types",
            "created_at": self.created_at,
            "preprocessing": {
                "lowercase": self.lowercase,
                "min_text_length": self.min_text_length,
            },
            "categories": self.categories,
            "label2id": self.label2id,
            "id2label": {str(k): v for k, v in self.id2label.items()},
        }

    @classmethod
    def from_config(cls, config_path_or_dict: str | Path | Dict[str, Any]) -> "ScamTypePipeline":
        """Loads ScamTypePipeline from saved configuration."""
        if isinstance(config_path_or_dict, (str, Path)):
            with open(config_path_or_dict, "r", encoding="utf-8-sig") as f:
                cfg = json.load(f)
        else:
            cfg = config_path_or_dict
        return cls(config=cfg)


# Backward compatibility alias
class ScamTypePreprocessor(ScamTypePipeline):
    """Backward-compatible alias for existing code."""

    def transform_single(self, text: str) -> str:
        return self.extract_features_single(text)["cleaned_text"]
