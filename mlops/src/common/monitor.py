"""
monitor.py
----------
Anonymized Model Prediction Monitoring System for ScamShield AI.
Records prediction metadata (model version, confidence, risk score, latency, input hash, input length)
without persisting sensitive raw user message/URL content.
Calculates performance stats and drift metrics for student MLOps reporting.
"""
import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.common.logger import get_logger
from .path_utils import MLOPS_ROOT, resolve_path

logger = get_logger("PredictionMonitor")


class PredictionMonitor:
    """Manages anonymized prediction logging and real-time monitoring statistics."""

    def __init__(self, log_dir: Optional[str | Path] = None):
        self.log_dir = resolve_path(log_dir or (MLOPS_ROOT / "logs"))
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = self.log_dir / "prediction_logs.jsonl"

    def _hash_input(self, raw_input: str) -> str:
        """Generates anonymized SHA-256 hash of raw input to detect duplicates without storing PII."""
        return hashlib.sha256(raw_input.strip().encode("utf-8")).hexdigest()[:16]

    def log_prediction(
        self,
        input_type: str,
        model_name: str,
        model_version: str,
        prediction_result: Dict[str, Any],
        raw_input: str,
        execution_time_ms: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Logs anonymized prediction entry to JSONL log file.
        Strips raw text content to preserve user privacy.
        """
        entry_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        anonymized_hash = self._hash_input(raw_input)
        input_length = len(raw_input.strip())

        # Extract anonymized prediction fields depending on input_type
        if input_type == "message":
            risk_score = prediction_result.get("riskScore", 0)
            status = prediction_result.get("status", "unknown")
            confidence = prediction_result.get("probability", round(risk_score / 100.0, 4))
            scam_type = prediction_result.get("scamType", "None")
        elif input_type == "scam_type":
            risk_score = int(prediction_result.get("confidence", 0.0) * 100)
            status = prediction_result.get("topScamType", "unknown")
            confidence = round(prediction_result.get("confidence", 0.0), 4)
            scam_type = prediction_result.get("topScamType", "unknown")
        elif input_type == "url":
            risk_score = prediction_result.get("riskScore", 0)
            status = prediction_result.get("status", "unknown")
            confidence = round(risk_score / 100.0, 4)
            scam_type = "Phishing URL" if risk_score >= 70 else "None"
        else:
            risk_score = 0
            status = "unknown"
            confidence = 0.0
            scam_type = "unknown"

        record = {
            "prediction_id": entry_id,
            "timestamp": timestamp,
            "input_type": input_type,
            "model_name": model_name,
            "model_version": model_version,
            "status": status,
            "risk_score": risk_score,
            "confidence": confidence,
            "scam_type": scam_type,
            "input_length": input_length,
            "anonymized_hash": anonymized_hash,
            "execution_time_ms": round(execution_time_ms, 2),
        }

        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(record) + "\n")
            logger.debug(f"Logged anonymized prediction [{entry_id[:8]}] for {model_name} ({model_version})")
        except Exception as e:
            logger.error(f"Failed to log prediction record: {e}")

        return record

    def read_logs(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Reads prediction log entries from the JSONL file."""
        if not self.log_file.exists():
            return []

        records: List[Dict[str, Any]] = []
        try:
            with open(self.log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()
                if limit:
                    lines = lines[-limit:]
                for line in lines:
                    line_str = line.strip()
                    if line_str:
                        records.append(json.loads(line_str))
        except Exception as e:
            logger.error(f"Error reading prediction logs: {e}")

        return records

    def get_summary_stats(self) -> Dict[str, Any]:
        """Computes summary statistics and metrics across all logged predictions."""
        logs = self.read_logs()
        if not logs:
            return {
                "total_predictions": 0,
                "models_monitored": {},
                "input_type_breakdown": {},
                "status_distribution": {},
                "avg_risk_score": 0.0,
                "avg_confidence": 0.0,
                "avg_execution_time_ms": 0.0,
                "privacy_notice": "Raw user text is strictly anonymized. Only length, hash, and prediction scores are persisted.",
            }

        total = len(logs)
        input_types: Dict[str, int] = {}
        models_monitored: Dict[str, Dict[str, Any]] = {}
        status_dist: Dict[str, int] = {}

        total_risk = 0.0
        total_conf = 0.0
        total_time = 0.0

        for r in logs:
            itype = r.get("input_type", "unknown")
            input_types[itype] = input_types.get(itype, 0) + 1

            mname = r.get("model_name", "unknown")
            mver = r.get("model_version", "v1.0.0")
            if mname not in models_monitored:
                models_monitored[mname] = {"active_version": mver, "count": 0}
            models_monitored[mname]["count"] += 1
            models_monitored[mname]["active_version"] = mver

            st = r.get("status", "unknown")
            status_dist[st] = status_dist.get(st, 0) + 1

            total_risk += float(r.get("risk_score", 0))
            total_conf += float(r.get("confidence", 0.0))
            total_time += float(r.get("execution_time_ms", 0.0))

        return {
            "total_predictions": total,
            "models_monitored": models_monitored,
            "input_type_breakdown": input_types,
            "status_distribution": status_dist,
            "avg_risk_score": round(total_risk / total, 2),
            "avg_confidence": round(total_conf / total, 4),
            "avg_execution_time_ms": round(total_time / total, 2),
            "privacy_notice": "Raw user text is strictly anonymized. Only length, hash, and prediction scores are persisted.",
        }


# Global monitor instance
prediction_monitor = PredictionMonitor()
