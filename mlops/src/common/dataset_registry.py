"""
dataset_registry.py
-------------------
Dataset Version Management System for ScamShield AI MLOps.
Provides dataset snapshot storage, metadata tracking, SHA-256 integrity verification,
and cataloging for student-friendly MLOps workflows.
"""
import csv
import hashlib
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .logger import get_logger
from .path_utils import MLOPS_ROOT, resolve_path

logger = get_logger("DatasetRegistry")


class DatasetRegistry:
    """Manages versioned datasets, metadata tracking, and integrity checks."""

    def __init__(self, versions_dir: Optional[str | Path] = None):
        target = versions_dir or (MLOPS_ROOT / "data" / "versions")
        self.versions_dir = resolve_path(target)
        self.versions_dir.mkdir(parents=True, exist_ok=True)
        self.catalog_file = self.versions_dir / "catalog.json"
        self._init_catalog()

    def _init_catalog(self) -> None:
        """Initializes the master catalog file if it does not exist."""
        if not self.catalog_file.exists():
            with open(self.catalog_file, "w", encoding="utf-8") as f:
                json.dump({"catalog_version": "1.0", "datasets": {}}, f, indent=2)

    def _read_catalog(self) -> Dict[str, Any]:
        """Reads the master catalog JSON."""
        try:
            with open(self.catalog_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"catalog_version": "1.0", "datasets": {}}

    def _write_catalog(self, catalog: Dict[str, Any]) -> None:
        """Writes the master catalog JSON."""
        with open(self.catalog_file, "w", encoding="utf-8") as f:
            json.dump(catalog, f, indent=2)

    @staticmethod
    def calculate_checksum(file_path: str | Path) -> str:
        """Computes SHA-256 checksum of a file for integrity tracking."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def _inspect_file(
        self, file_path: Path, label_column: Optional[str] = None
    ) -> Tuple[int, List[str], Dict[str, Any], str]:
        """
        Extracts sample count, feature names, label distribution, and format
        from a JSON or CSV dataset file.
        """
        suffix = file_path.suffix.lower()
        records: List[Dict[str, Any]] = []

        if suffix == ".json":
            file_format = "json"
            with open(file_path, "r", encoding="utf-8-sig") as f:
                content = json.load(f)
                if isinstance(content, list):
                    records = content
                elif isinstance(content, dict) and "data" in content and isinstance(content["data"], list):
                    records = content["data"]
                elif isinstance(content, dict):
                    # Single record or dictionary format
                    records = [content]
        elif suffix in [".csv", ".tsv"]:
            file_format = suffix.replace(".", "")
            delimiter = "\t" if suffix == ".tsv" else ","
            with open(file_path, "r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f, delimiter=delimiter)
                records = list(reader)
        else:
            raise ValueError(f"Unsupported file format '{suffix}'. Supported formats: .json, .csv, .tsv")

        num_records = len(records)
        all_keys = list(records[0].keys()) if num_records > 0 else []

        if label_column:
            features = [k for k in all_keys if k != label_column]
            # Calculate label counts and classes
            counts: Dict[str, int] = {}
            for r in records:
                val = str(r.get(label_column, "unknown"))
                counts[val] = counts.get(val, 0) + 1
            labels_info = {
                "label_column": label_column,
                "classes": sorted(list(counts.keys())),
                "distribution": counts,
            }
        else:
            features = all_keys
            labels_info = {
                "label_column": None,
                "classes": [],
                "distribution": {},
            }

        return num_records, features, labels_info, file_format

    def register_dataset(
        self,
        dataset_name: str,
        file_path: str | Path,
        version: str,
        label_column: Optional[str] = None,
        description: str = "",
    ) -> Dict[str, Any]:
        """
        Registers a new dataset version snapshot, extracts metadata,
        verifies SHA-256 checksum, stores artifacts, and updates the catalog.
        """
        src_path = Path(file_path)
        if not src_path.exists():
            raise FileNotFoundError(f"Source dataset file not found: {file_path}")

        # Extract dataset metadata
        num_records, features, labels_info, file_format = self._inspect_file(src_path, label_column=label_column)
        checksum = self.calculate_checksum(src_path)
        file_size = src_path.stat().st_size

        # Create destination directory: mlops/data/versions/<dataset_name>/<version>/
        target_dir = self.versions_dir / dataset_name / version
        target_dir.mkdir(parents=True, exist_ok=True)

        target_file = target_dir / f"dataset.{file_format}"
        if src_path.resolve() != target_file.resolve():
            shutil.copy2(src_path, target_file)

        creation_date = datetime.now(timezone.utc).isoformat()

        metadata: Dict[str, Any] = {
            "dataset_name": dataset_name,
            "version": version,
            "creation_date": creation_date,
            "num_records": num_records,
            "features": features,
            "label_column": label_column,
            "labels": labels_info,
            "checksum_sha256": checksum,
            "file_format": file_format,
            "file_size_bytes": file_size,
            "description": description or f"Snapshot of {dataset_name} dataset version {version}",
            "file_path": str(target_file),
        }

        # Save metadata.json in the version directory
        meta_file = target_dir / "metadata.json"
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        # Update master catalog
        catalog = self._read_catalog()
        if dataset_name not in catalog["datasets"]:
            catalog["datasets"][dataset_name] = {"latest": version, "versions": {}}

        catalog["datasets"][dataset_name]["latest"] = version
        catalog["datasets"][dataset_name]["versions"][version] = {
            "version": version,
            "creation_date": creation_date,
            "num_records": num_records,
            "features": features,
            "labels": labels_info,
            "file_format": file_format,
            "checksum_sha256": checksum,
            "description": metadata["description"],
            "path": str(target_dir),
            "file": str(target_file),
        }
        self._write_catalog(catalog)

        logger.info(f"Registered dataset '{dataset_name}' version '{version}' ({num_records} records) at {target_dir}")
        return metadata

    def get_dataset(self, dataset_name: str, version: str = "latest") -> Tuple[Path, Dict[str, Any]]:
        """Retrieves the file path and metadata for a specific dataset version."""
        catalog = self._read_catalog()
        if dataset_name not in catalog.get("datasets", {}):
            raise KeyError(f"Dataset '{dataset_name}' not found in registry.")

        ds_info = catalog["datasets"][dataset_name]
        target_version = ds_info["latest"] if version == "latest" else version

        if target_version not in ds_info.get("versions", {}):
            raise KeyError(f"Version '{target_version}' for dataset '{dataset_name}' not found in catalog.")

        v_entry = ds_info["versions"][target_version]
        meta_file = Path(v_entry["path"]) / "metadata.json"
        data_file = Path(v_entry["file"])

        if not meta_file.exists():
            raise FileNotFoundError(f"Metadata file missing at {meta_file}")
        if not data_file.exists():
            raise FileNotFoundError(f"Data file missing at {data_file}")

        with open(meta_file, "r", encoding="utf-8") as f:
            meta = json.load(f)

        return data_file, meta

    def get_metadata(self, dataset_name: str, version: str = "latest") -> Dict[str, Any]:
        """Retrieves metadata dictionary for a dataset version."""
        _, meta = self.get_dataset(dataset_name, version=version)
        return meta

    def list_datasets(self, dataset_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists all registered dataset versions and summaries."""
        catalog = self._read_catalog()
        datasets = catalog.get("datasets", {})
        results: List[Dict[str, Any]] = []

        target_names = [dataset_name] if dataset_name else list(datasets.keys())

        for name in target_names:
            if name in datasets:
                d = datasets[name]
                latest_v = d.get("latest")
                for v_name, v_data in d.get("versions", {}).items():
                    results.append({
                        "dataset_name": name,
                        "version": v_name,
                        "is_latest": v_name == latest_v,
                        "creation_date": v_data.get("creation_date"),
                        "num_records": v_data.get("num_records", 0),
                        "features": v_data.get("features", []),
                        "labels": v_data.get("labels", {}),
                        "file_format": v_data.get("file_format", "json"),
                        "checksum_sha256": v_data.get("checksum_sha256", ""),
                        "description": v_data.get("description", ""),
                        "path": v_data.get("path"),
                    })
        return results
