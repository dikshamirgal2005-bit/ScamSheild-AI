"""
feedback.py
-----------
Feedback Loop Engine for ScamShield AI.
Ingests user feedback (Correct / Incorrect) tied to specific prediction IDs and model versions.
Prepares labeled data records for future model retraining cycles without triggering automatic retraining.
"""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.common.logger import get_logger
from .path_utils import MLOPS_ROOT, resolve_path

logger = get_logger("FeedbackManager")


class FeedbackManager:
    """Manages user prediction feedback and prepares candidate datasets for retraining."""

    def __init__(self, feedback_dir: Optional[str | Path] = None):
        self.feedback_dir = resolve_path(feedback_dir or (MLOPS_ROOT / "data" / "feedback"))
        self.feedback_dir.mkdir(parents=True, exist_ok=True)
        self.feedback_file = self.feedback_dir / "user_feedback.jsonl"

    def submit_feedback(
        self,
        model_name: str,
        model_version: str,
        prediction_id: str,
        user_feedback: str,  # 'correct' | 'incorrect'
        input_type: str,
        predicted_label: str,
        corrected_label: Optional[str] = None,
        text_or_url: Optional[str] = None,
        user_comments: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Records user feedback entry with timestamp and model version.
        Prepares item for future retraining review.
        """
        feedback_id = f"fb_{uuid.uuid4().hex[:12]}"
        timestamp = datetime.now(timezone.utc).isoformat()
        feedback_clean = user_feedback.lower().strip()

        # Determine target label for retraining dataset
        if feedback_clean == "correct":
            target_label = predicted_label
            status = "approved"
        else:
            target_label = corrected_label or "scam" if predicted_label == "safe" else "safe"
            status = "pending_review"

        entry = {
            "feedback_id": feedback_id,
            "prediction_id": prediction_id,
            "timestamp": timestamp,
            "input_type": input_type,
            "model_name": model_name,
            "model_version": model_version,
            "user_feedback": feedback_clean,  # 'correct' or 'incorrect'
            "predicted_label": predicted_label,
            "corrected_label": corrected_label,
            "target_label": target_label,
            "status": status,
            "text_or_url": text_or_url or "",
            "user_comments": user_comments or "",
            "ready_for_training": bool(text_or_url and target_label),
        }

        try:
            with open(self.feedback_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
            logger.info(
                f"Feedback recorded [{feedback_id}] for model {model_name} ({model_version}): "
                f"User marked '{feedback_clean}' (Target Label: {target_label})"
            )
        except Exception as e:
            logger.error(f"Failed to record user feedback: {e}")

        return entry

    def read_feedback(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Reads recorded user feedback entries from JSONL file."""
        if not self.feedback_file.exists():
            return []

        entries: List[Dict[str, Any]] = []
        try:
            with open(self.feedback_file, "r", encoding="utf-8") as f:
                lines = f.readlines()
                if limit:
                    lines = lines[-limit:]
                for line in lines:
                    line_str = line.strip()
                    if line_str:
                        entries.append(json.loads(line_str))
        except Exception as e:
            logger.error(f"Error reading user feedback file: {e}")

        return entries

    def get_feedback_summary(self) -> Dict[str, Any]:
        """Calculates aggregated metrics on user feedback and model version performance."""
        feedback_list = self.read_feedback()
        if not feedback_list:
            return {
                "total_feedback_submissions": 0,
                "total_correct": 0,
                "total_incorrect": 0,
                "overall_accuracy_rate": 1.0,
                "feedback_by_model": {},
                "retraining_candidates_ready": 0,
            }

        total = len(feedback_list)
        correct_count = 0
        incorrect_count = 0
        by_model: Dict[str, Dict[str, Any]] = {}
        retraining_candidates = 0

        for fb in feedback_list:
            is_correct = fb.get("user_feedback") == "correct"
            if is_correct:
                correct_count += 1
            else:
                incorrect_count += 1

            if fb.get("ready_for_training"):
                retraining_candidates += 1

            mname = fb.get("model_name", "unknown")
            mver = fb.get("model_version", "v1.0.0")

            if mname not in by_model:
                by_model[mname] = {
                    "total": 0,
                    "correct": 0,
                    "incorrect": 0,
                    "model_version": mver,
                }
            by_model[mname]["total"] += 1
            by_model[mname]["model_version"] = mver
            if is_correct:
                by_model[mname]["correct"] += 1
            else:
                by_model[mname]["incorrect"] += 1

        for mname, data in by_model.items():
            tot = data["total"]
            data["accuracy_rate"] = round(data["correct"] / tot, 4) if tot > 0 else 1.0

        return {
            "total_feedback_submissions": total,
            "total_correct": correct_count,
            "total_incorrect": incorrect_count,
            "overall_accuracy_rate": round(correct_count / total, 4) if total > 0 else 1.0,
            "feedback_by_model": by_model,
            "retraining_candidates_ready": retraining_candidates,
        }

    def export_retraining_dataset(
        self,
        model_name: str,
        output_file: Optional[str | Path] = None,
    ) -> Dict[str, Any]:
        """
        Filters and exports prepared user feedback samples into a labeled dataset file
        suitable for merging into future model retraining pipelines.
        """
        all_fb = self.read_feedback()
        candidates: List[Dict[str, Any]] = []

        for fb in all_fb:
            if fb.get("model_name") == model_name and fb.get("ready_for_training"):
                candidates.append({
                    "text": fb.get("text_or_url"),
                    "url": fb.get("text_or_url"),
                    "label": fb.get("target_label"),
                    "source": f"user_feedback_{fb.get('feedback_id')}",
                    "model_version_evaluated": fb.get("model_version"),
                    "user_comments": fb.get("user_comments"),
                })

        out_path = resolve_path(output_file or (self.feedback_dir / f"{model_name}_retrain_feedback.json"))
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(candidates, f, indent=2)

        logger.info(f"Exported {len(candidates)} prepared retraining samples for {model_name} to {out_path}")
        return {
            "model_name": model_name,
            "exported_samples": len(candidates),
            "output_path": str(out_path),
        }


# Global instance
feedback_manager = FeedbackManager()
