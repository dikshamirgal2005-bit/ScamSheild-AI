"""
base_pipeline.py
----------------
Abstract base class for reusable ScamShield AI data preprocessing pipelines.
Provides consistent dataset ingestion, missing/invalid record cleaning,
train/val/test splitting, and configuration persistence for reproducible inference.
"""
import csv
import json
import random
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from src.common.logger import get_logger

logger = get_logger("BasePipeline")


class BaseDataPipeline(ABC):
    """Abstract base pipeline for dataset cleaning, feature engineering, and splitting."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.created_at = datetime.now(timezone.utc).isoformat()

    def load_data(self, source: str | Path) -> List[Dict[str, Any]]:
        """Loads records from a JSON or CSV file with UTF-8 / UTF-8-BOM support."""
        src_path = Path(source)
        if not src_path.exists():
            raise FileNotFoundError(f"Source file not found: {source}")

        suffix = src_path.suffix.lower()
        records: List[Dict[str, Any]] = []

        if suffix == ".json":
            with open(src_path, "r", encoding="utf-8-sig") as f:
                content = json.load(f)
                if isinstance(content, list):
                    records = content
                elif isinstance(content, dict) and "data" in content and isinstance(content["data"], list):
                    records = content["data"]
                elif isinstance(content, dict):
                    records = [content]
        elif suffix in [".csv", ".tsv"]:
            delimiter = "\t" if suffix == ".tsv" else ","
            with open(src_path, "r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f, delimiter=delimiter)
                records = list(reader)
        else:
            raise ValueError(f"Unsupported dataset format '{suffix}'. Supported: .json, .csv, .tsv")

        logger.info(f"Loaded {len(records)} raw records from {source}")
        return records

    @abstractmethod
    def clean_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filters out null, malformed, or invalid values."""
        pass

    @abstractmethod
    def extract_features(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Performs domain-specific feature engineering."""
        pass

    @abstractmethod
    def transform_inference(self, raw_input: Any) -> Dict[str, Any]:
        """Applies identical transformations to a single raw sample during inference."""
        pass

    def split_data(
        self,
        records: List[Dict[str, Any]],
        train_ratio: float = 0.8,
        val_ratio: float = 0.1,
        test_ratio: float = 0.1,
        seed: int = 42,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Deterministically splits records into train, validation, and test partitions.
        Gracefully handles small datasets so partitions are non-empty when record count allows.
        """
        if not records:
            return {"train": [], "val": [], "test": []}

        n = len(records)
        shuffled = list(records)
        rng = random.Random(seed)
        rng.shuffle(shuffled)

        if n == 1:
            return {"train": shuffled, "val": [], "test": []}
        elif n == 2:
            return {"train": [shuffled[0]], "val": [], "test": [shuffled[1]]}

        n_train = max(1, int(round(n * train_ratio)))
        n_val = int(round(n * val_ratio))
        n_test = n - n_train - n_val

        # Ensure test has at least 1 sample if n >= 3
        if n_test <= 0 and n >= 3:
            if n_train > 1:
                n_train -= 1
                n_test += 1

        train_data = shuffled[:n_train]
        val_data = shuffled[n_train : n_train + n_val]
        test_data = shuffled[n_train + n_val :]

        logger.info(f"Split {n} records -> Train: {len(train_data)}, Val: {len(val_data)}, Test: {len(test_data)}")
        return {
            "train": train_data,
            "val": val_data,
            "test": test_data,
        }

    def save_processed(
        self,
        splits: Dict[str, List[Dict[str, Any]]],
        output_dir: str | Path,
    ) -> Dict[str, str]:
        """Saves train, validation, and test datasets along with preprocessor_config.json."""
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)

        saved_paths: Dict[str, str] = {}
        for split_name, data in splits.items():
            split_file = out_path / f"{split_name}.json"
            with open(split_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            saved_paths[split_name] = str(split_file)

        # Save configuration
        config_file = out_path / "preprocessor_config.json"
        self.save_config(config_file)
        saved_paths["config"] = str(config_file)

        logger.info(f"Saved processed splits and config to {out_path}")
        return saved_paths

    def get_config(self) -> Dict[str, Any]:
        """Returns the dictionary representation of preprocessor settings."""
        return {
            "pipeline_class": self.__class__.__name__,
            "created_at": self.created_at,
            "config": self.config,
        }

    def save_config(self, config_path: str | Path) -> None:
        """Saves preprocessing configuration to a JSON file."""
        cfg = self.get_config()
        path = Path(config_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)

    @classmethod
    @abstractmethod
    def from_config(cls, config_path_or_dict: str | Path | Dict[str, Any]) -> "BaseDataPipeline":
        """Reconstructs the pipeline instance from a saved configuration file or dict."""
        pass

    def run(
        self,
        source: str | Path,
        output_dir: Optional[str | Path] = None,
        train_ratio: float = 0.8,
        val_ratio: float = 0.1,
        test_ratio: float = 0.1,
        seed: int = 42,
    ) -> Dict[str, Any]:
        """Executes the complete preprocessing workflow from loading to saving."""
        raw_records = self.load_data(source)
        cleaned = self.clean_records(raw_records)
        features = self.extract_features(cleaned)
        splits = self.split_data(features, train_ratio=train_ratio, val_ratio=val_ratio, test_ratio=test_ratio, seed=seed)

        saved_paths: Dict[str, str] = {}
        if output_dir:
            saved_paths = self.save_processed(splits, output_dir)

        return {
            "raw_count": len(raw_records),
            "cleaned_count": len(cleaned),
            "processed_count": len(features),
            "splits": {k: len(v) for k, v in splits.items()},
            "saved_paths": saved_paths,
            "data": splits,
        }
