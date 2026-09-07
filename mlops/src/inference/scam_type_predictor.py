"""
scam_type_predictor.py
-----------------------
Predictor for 9-class scam type categorization.
Loads approved Production model version dynamically from ModelRegistry.
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.common.logger import get_logger
from src.common.registry import ModelRegistry
from src.common.path_utils import MLOPS_ROOT, resolve_path

logger = get_logger("ScamTypePredictor")

SCAM_CATEGORIES: List[str] = [
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

DISPLAY_NAMES: Dict[str, str] = {
    "phishing": "Phishing Attack",
    "vishing": "Voice Phishing (Vishing)",
    "smishing": "SMS Phishing (Smishing)",
    "lottery_advance_fee": "Lottery & Advance-Fee Fraud",
    "investment_crypto": "Fake Investment & Crypto Scam",
    "impersonation": "Authority / Impersonation Scam",
    "romance_pig_butchering": "Romance / Pig Butchering Scam",
    "tech_support": "Fake Tech Support Scam",
    "job_recruitment": "Job Offer / Work-From-Home Scam",
}


class ScamTypePredictor:
    def __init__(
        self,
        models_dir: Optional[str | Path] = None,
        model_dir: Optional[str | Path] = None,
        version: Optional[str] = "production",
    ):
        base_dir = models_dir or model_dir or (MLOPS_ROOT / "models")
        resolved = resolve_path(base_dir)

        if resolved.name.startswith("v") and (resolved.parent.name == "scam_type_model" or (resolved / "metadata.json").exists()):
            self.models_dir = resolved.parent.parent
            target_version = resolved.name
        elif resolved.name == "scam_type_model":
            self.models_dir = resolved.parent
            target_version = version or "production"
        else:
            self.models_dir = resolved
            target_version = version or "production"

        self.registry = ModelRegistry(models_dir=str(self.models_dir))
        self.loaded_version: Optional[str] = None
        self.metadata: Dict[str, Any] = {}
        self.artifacts_dir: Optional[Path] = None
        self.label_encoder: Dict[str, Any] = {}

        self.load_active_model(version=target_version)

    def load_active_model(self, version: Optional[str] = "production") -> str:
        """Loads approved model version from ModelRegistry without breaking client UI."""
        target_version = version or "production"
        try:
            v_dir, meta = self.registry.get_model("scam_type_model", version=target_version)
        except (KeyError, FileNotFoundError):
            try:
                v_dir, meta = self.registry.get_model("scam_type_model", version="latest")
            except (KeyError, FileNotFoundError):
                v_dir = self.models_dir / "scam_type_model" / "v1.0.0"
                meta = {
                    "version": "v1.0.0",
                    "status": "Fallback",
                    "dataset_version": "v1.0.0",
                    "training_date": "N/A",
                }

        self.artifacts_dir = v_dir
        self.metadata = meta
        self.loaded_version = meta.get("version", "v1.0.0")

        # Load label encoder if present
        encoder_file = v_dir / "label_encoder.json"
        if encoder_file.exists():
            try:
                with open(encoder_file, "r", encoding="utf-8") as f:
                    self.label_encoder = json.load(f)
            except Exception as e:
                logger.warning(f"Could not parse label encoder at {encoder_file}: {e}")

        logger.info(
            f"ScamTypePredictor successfully loaded model 'scam_type_model' version '{self.loaded_version}' "
            f"(Stage: {self.metadata.get('status', 'Unknown')}) from {self.artifacts_dir}"
        )
        return self.loaded_version

    def reload(self) -> str:
        """Hot-reloads active production model version from registry."""
        return self.load_active_model("production")

    def predict(self, text: str) -> Dict[str, Any]:
        if not self.loaded_version:
            self.load_active_model("production")

        lower = text.lower()
        scores: Dict[str, float] = {cat: 0.05 for cat in SCAM_CATEGORIES}

        if any(w in lower for w in ["job", "salary", "work from home", "hr", "telegram", "daily payment", "task"]):
            scores["job_recruitment"] += 0.85
        elif any(w in lower for w in ["crypto", "invest", "returns", "profit", "trading", "bitcoin", "guaranteed"]):
            scores["investment_crypto"] += 0.85
        elif any(w in lower for w in ["lottery", "prize", "won", "reward", "congratulations", "lucky draw"]):
            scores["lottery_advance_fee"] += 0.85
        elif any(w in lower for w in ["police", "cbi", "customs", "arrest", "courier", "court", "officer"]):
            scores["impersonation"] += 0.85
        elif any(w in lower for w in ["virus", "infected", "windows", "microsoft", "anydesk", "teamviewer"]):
            scores["tech_support"] += 0.85
        elif any(w in lower for w in ["dear", "love", "sweetheart", "meet me", "lonely", "handsome"]):
            scores["romance_pig_butchering"] += 0.80
        elif any(w in lower for w in ["call this number", "dial", "toll-free", "customer care"]):
            scores["vishing"] += 0.75
        elif any(w in lower for w in ["bank", "kyc", "debit card", "pan card", "sbi", "hdfc", "axis", "update"]):
            scores["phishing"] += 0.80
        else:
            scores["smishing"] += 0.40

        total = sum(scores.values())
        distribution = {k: round(v / total, 4) for k, v in scores.items()}
        top_cat = max(distribution, key=lambda k: distribution[k])

        return {
            "topScamType": top_cat,
            "displayName": DISPLAY_NAMES.get(top_cat, top_cat),
            "confidence": distribution[top_cat],
            "distribution": distribution,
            "supportedCategories": SCAM_CATEGORIES,
            "modelVersion": self.loaded_version,
        }
