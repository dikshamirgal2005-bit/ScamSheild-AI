"""
url_pipeline.py
---------------
End-to-end tabular preprocessing and feature extraction pipeline for URL Threat Classifier.
Extracts lexical, structural, and Shannon entropy metrics, computes dataset statistical
distributions, encodes risk tiers, and generates reproducible data splits.
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base_pipeline import BaseDataPipeline
from .url_features import URLExtractor


class URLPipeline(BaseDataPipeline):
    """Preprocessing and feature engineering pipeline for URL risk and phishing analysis."""

    LABEL_MAPPING = {
        "safe": 0,
        "warning": 1,
        "suspicious": 1,
        "danger": 2,
        "malicious": 2,
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config=config)
        cfg = self.config or {}
        self.extractor = URLExtractor(config=cfg.get("extractor", {}))
        self.label_mapping = cfg.get("label_mapping", self.LABEL_MAPPING)
        self.feature_stats: Dict[str, Dict[str, float]] = cfg.get("feature_stats", {})

    def clean_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Cleans URL dataset, removing nulls, empty strings, and malformed entries."""
        cleaned: List[Dict[str, Any]] = []
        for r in records:
            if not isinstance(r, dict):
                continue
            url = r.get("url")
            if not isinstance(url, str):
                continue
            url_clean = url.strip()
            if len(url_clean) < 4 or "." not in url_clean:
                continue

            item = dict(r)
            item["url"] = url_clean
            cleaned.append(item)
        return cleaned

    def extract_features_single(self, url: str) -> Dict[str, Any]:
        """Extracts complete lexical and structural feature dictionary for a URL."""
        return self.extractor.extract_features(url)

    def extract_features(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extracts tabular features for all records and computes dataset statistics."""
        features_list: List[Dict[str, Any]] = []
        numerical_accumulators: Dict[str, List[float]] = {}

        for r in records:
            feats = self.extract_features_single(r["url"])
            item: Dict[str, Any] = {"url": r["url"]}
            item.update(feats)

            if "id" in r:
                item["id"] = r["id"]

            # Label resolution
            raw_label = r.get("label", r.get("status"))
            if raw_label is not None:
                lbl_str = str(raw_label).lower().strip()
                if lbl_str in self.label_mapping:
                    item["label"] = self.label_mapping[lbl_str]
                    item["status"] = lbl_str
                elif lbl_str.isdigit():
                    item["label"] = int(lbl_str)
                    item["status"] = "danger" if item["label"] == 2 else ("warning" if item["label"] == 1 else "safe")
                else:
                    item["label"] = 2 if "danger" in lbl_str or "malicious" in lbl_str else 0
                    item["status"] = lbl_str
            else:
                item["label"] = 0
                item["status"] = "safe"

            # Accumulate numerical features for summary stats
            for k, v in feats.items():
                if isinstance(v, (int, float)):
                    numerical_accumulators.setdefault(k, []).append(float(v))

            features_list.append(item)

        # Compute min/max/mean for numerical features
        self.feature_stats = {}
        for feat_name, values in numerical_accumulators.items():
            if values:
                self.feature_stats[feat_name] = {
                    "min": round(min(values), 4),
                    "max": round(max(values), 4),
                    "mean": round(sum(values) / len(values), 4),
                }

        return features_list

    def transform_inference(self, raw_input: str) -> Dict[str, Any]:
        """Transforms a raw URL string into the standardized feature set."""
        if not isinstance(raw_input, str):
            raw_input = ""
        feats = self.extract_features_single(raw_input)
        return {
            "url": raw_input,
            "features": feats,
        }

    def get_config(self) -> Dict[str, Any]:
        """Serializes URL pipeline configuration and computed feature bounds."""
        sample_feats = self.extractor.extract_features("http://example.com")
        return {
            "pipeline_class": self.__class__.__name__,
            "pipeline_type": "urls",
            "created_at": self.created_at,
            "label_mapping": self.label_mapping,
            "feature_names": list(sample_feats.keys()),
            "feature_stats": self.feature_stats,
            "suspicious_tlds": self.extractor.SUSPICIOUS_TLDS,
            "suspicious_keywords": self.extractor.SUSPICIOUS_KEYWORDS,
        }

    @classmethod
    def from_config(cls, config_path_or_dict: str | Path | Dict[str, Any]) -> "URLPipeline":
        """Instantiates URLPipeline from saved configuration."""
        if isinstance(config_path_or_dict, (str, Path)):
            with open(config_path_or_dict, "r", encoding="utf-8-sig") as f:
                cfg = json.load(f)
        else:
            cfg = config_path_or_dict
        return cls(config=cfg)
