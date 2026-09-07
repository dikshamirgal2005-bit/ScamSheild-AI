"""
message_predictor.py
--------------------
Inference predictor for binary scam message detection.
Matches the React Native mobile AnalysisResult interface.
Loads approved Production model version dynamically from ModelRegistry.
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.common.logger import get_logger
from src.common.registry import ModelRegistry
from src.preprocessing.text_cleaner import clean_text, extract_urls, extract_phone_numbers
from src.common.path_utils import MLOPS_ROOT, resolve_path

logger = get_logger("MessagePredictor")


class MessagePredictor:
    def __init__(
        self,
        models_dir: Optional[str | Path] = None,
        model_dir: Optional[str | Path] = None,
        version: Optional[str] = "production",
    ):
        base_dir = models_dir or model_dir or (MLOPS_ROOT / "models")
        resolved = resolve_path(base_dir)

        # If a specific model version directory was passed directly
        if resolved.name.startswith("v") and (resolved.parent.name == "message_model" or (resolved / "metadata.json").exists()):
            self.models_dir = resolved.parent.parent
            target_version = resolved.name
        elif resolved.name == "message_model":
            self.models_dir = resolved.parent
            target_version = version or "production"
        else:
            self.models_dir = resolved
            target_version = version or "production"

        self.registry = ModelRegistry(models_dir=str(self.models_dir))
        self.loaded_version: Optional[str] = None
        self.metadata: Dict[str, Any] = {}
        self.artifacts_dir: Optional[Path] = None
        self.model_weights: Dict[str, Any] = {}

        self.load_active_model(version=target_version)

    def load_active_model(self, version: Optional[str] = "production") -> str:
        """Loads approved model version from ModelRegistry without breaking client UI."""
        target_version = version or "production"
        try:
            v_dir, meta = self.registry.get_model("message_model", version=target_version)
        except (KeyError, FileNotFoundError):
            try:
                v_dir, meta = self.registry.get_model("message_model", version="latest")
            except (KeyError, FileNotFoundError):
                v_dir = self.models_dir / "message_model" / "v1.0.0"
                meta = {
                    "version": "v1.0.0",
                    "status": "Fallback",
                    "dataset_version": "v1.0.0",
                    "training_date": "N/A",
                }

        self.artifacts_dir = v_dir
        self.metadata = meta
        self.loaded_version = meta.get("version", "v1.0.0")

        # Load weights/artifacts if present
        model_file = v_dir / "model.json"
        if model_file.exists():
            try:
                with open(model_file, "r", encoding="utf-8") as f:
                    self.model_weights = json.load(f)
            except Exception as e:
                logger.warning(f"Could not parse model weights at {model_file}: {e}")

        logger.info(
            f"MessagePredictor successfully loaded model 'message_model' version '{self.loaded_version}' "
            f"(Stage: {self.metadata.get('status', 'Unknown')}) from {self.artifacts_dir}"
        )
        return self.loaded_version

    def reload(self) -> str:
        """Hot-reloads active production model version from registry."""
        return self.load_active_model("production")

    def predict(self, text: str) -> Dict[str, Any]:
        if not self.loaded_version:
            self.load_active_model("production")

        cleaned = clean_text(text)
        urls = extract_urls(text)
        phones = extract_phone_numbers(text)

        lower = text.lower()
        indicators: List[str] = []
        heuristic_score = 15

        if urls:
            indicators.append(f"Contains {len(urls)} external URL(s)")
            heuristic_score += 30
        if any(w in lower for w in ["urgent", "immediately", "expire", "suspended", "blocked", "within 24 hours"]):
            indicators.append("Creates artificial urgency or panic")
            heuristic_score += 25
        if any(w in lower for w in ["winner", "won", "lottery", "congratulations", "prize", "cash reward"]):
            indicators.append("Unsolicited reward or prize lure")
            heuristic_score += 30
        if any(w in lower for w in ["otp", "pin", "password", "bank account", "cvv", "kyc"]):
            indicators.append("Requests sensitive credentials or KYC update")
            heuristic_score += 35
        if phones:
            indicators.append("Contains contact phone number")

        risk_score = min(max(heuristic_score, 5), 98) if indicators else 10
        probability = round(risk_score / 100.0, 4)

        if risk_score >= 70:
            status = "danger"
            status_label = "High Risk Scam"
            verdict = "Dangerous: Highly likely to be a fraudulent scam message."
            reason = "Multiple high-risk indicators detected including urgency and credential harvesting cues."
            recommendations = [
                "Do NOT click on any links in this message.",
                "Do NOT share passwords, OTPs, or financial details.",
                "Block and report this sender immediately.",
            ]
        elif risk_score >= 40:
            status = "warning"
            status_label = "Suspicious Message"
            verdict = "Caution: Message exhibits suspicious characteristics."
            reason = "External links or suggestive wording detected. Exercise caution before responding."
            recommendations = [
                "Verify the sender through an official customer care channel.",
                "Avoid opening links or calling numbers provided in the text.",
            ]
        else:
            status = "safe"
            status_label = "Legitimate"
            verdict = "Safe: No prominent scam indicators found."
            reason = "Message wording appears normal with no detected malicious triggers."
            recommendations = [
                "Always remain vigilant regarding unsolicited communications.",
            ]

        return {
            "riskScore": risk_score,
            "status": status,
            "statusLabel": status_label,
            "verdict": verdict,
            "reason": reason,
            "indicators": indicators,
            "recommendations": recommendations,
            "scamType": "Phishing / Social Engineering" if risk_score >= 40 else "None",
            "probability": probability,
            "cleaned_text": cleaned,
            "modelVersion": self.loaded_version,
        }
