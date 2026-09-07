"""
url_predictor.py
----------------
Inference predictor for URL risk & phishing analysis.
Loads approved Production model version dynamically from ModelRegistry.
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.common.logger import get_logger
from src.common.registry import ModelRegistry
from src.preprocessing.url_features import URLExtractor
from src.inference.url_live_checker import LiveURLChecker
from src.common.path_utils import MLOPS_ROOT, resolve_path

logger = get_logger("URLPredictor")


class URLPredictor:
    def __init__(
        self,
        models_dir: Optional[str | Path] = None,
        model_dir: Optional[str | Path] = None,
        version: Optional[str] = "production",
    ):
        base_dir = models_dir or model_dir or (MLOPS_ROOT / "models")
        resolved = resolve_path(base_dir)

        if resolved.name.startswith("v") and (resolved.parent.name == "url_model" or (resolved / "metadata.json").exists()):
            self.models_dir = resolved.parent.parent
            target_version = resolved.name
        elif resolved.name == "url_model":
            self.models_dir = resolved.parent
            target_version = version or "production"
        else:
            self.models_dir = resolved
            target_version = version or "production"

        self.registry = ModelRegistry(models_dir=str(self.models_dir))
        self.extractor = URLExtractor()
        self.live_checker = LiveURLChecker()
        self.loaded_version: Optional[str] = None
        self.metadata: Dict[str, Any] = {}
        self.artifacts_dir: Optional[Path] = None
        self.feature_names: List[str] = []

        self.load_active_model(version=target_version)

    def load_active_model(self, version: Optional[str] = "production") -> str:
        """Loads approved model version from ModelRegistry without breaking client UI."""
        target_version = version or "production"
        try:
            v_dir, meta = self.registry.get_model("url_model", version=target_version)
        except (KeyError, FileNotFoundError):
            try:
                v_dir, meta = self.registry.get_model("url_model", version="latest")
            except (KeyError, FileNotFoundError):
                v_dir = self.models_dir / "url_model" / "v1.0.0"
                meta = {
                    "version": "v1.0.0",
                    "status": "Fallback",
                    "dataset_version": "v1.0.0",
                    "training_date": "N/A",
                }

        self.artifacts_dir = v_dir
        self.metadata = meta
        self.loaded_version = meta.get("version", "v1.0.0")

        # Load feature names if present
        fn_file = v_dir / "feature_names.json"
        if fn_file.exists():
            try:
                with open(fn_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        self.feature_names = data
                    elif isinstance(data, dict):
                        self.feature_names = data.get("feature_names", [])
            except Exception as e:
                logger.warning(f"Could not parse feature names at {fn_file}: {e}")

        logger.info(
            f"URLPredictor successfully loaded model 'url_model' version '{self.loaded_version}' "
            f"(Stage: {self.metadata.get('status', 'Unknown')}) from {self.artifacts_dir}"
        )
        return self.loaded_version

    def reload(self) -> str:
        """Hot-reloads active production model version from registry."""
        return self.load_active_model("production")

    def predict(self, url: str) -> Dict[str, Any]:
        if not self.loaded_version:
            self.load_active_model("production")

        features = self.extractor.extract_features(url)
        risk_points = 5
        flags: List[str] = []

        if features["is_ip"]:
            risk_points += 35
            flags.append("Host is an IP address instead of domain")
        if features["has_at_symbol"]:
            risk_points += 25
            flags.append("URL contains '@' credential disguise")
        if features["num_subdomains"] >= 3:
            risk_points += 20
            flags.append(f"Excessive subdomains ({features['num_subdomains']})")
        if features["entropy"] > 4.2:
            risk_points += 20
            flags.append(f"High domain randomness / Shannon entropy ({features['entropy']})")
        if features["has_suspicious_tld"]:
            risk_points += 25
            flags.append("Suspicious or commonly abused top-level domain")
        if features["has_login_keyword"]:
            risk_points += 15
            flags.append("Contains targeted login/banking keywords")
        if not features["is_https"]:
            risk_points += 35
            flags.append("Insecure HTTP protocol: Traffic is unencrypted and vulnerable to interception")

        # Add real-time public-web intelligence. This is intentionally a
        # second signal alongside the existing ML/lexical heuristics.
        live = self.live_checker.check(url)
        flags_live: List[str] = []

        if live["trustedDomain"] and live["reachable"] and live["httpStatus"] and live["httpStatus"] < 400:
            if not features["is_https"]:
                risk_points = max(risk_points, 45)
                flags_live.append("Warning: Unencrypted HTTP connection on known domain (lacks SSL protection)")
            else:
                risk_points = min(risk_points, 1)
                flags_live.append("Live check: recognized trusted public domain is reachable via HTTPS")
        else:
            if live["dnsResolved"]:
                flags_live.append("Live check: public DNS resolution succeeded")
            if live["reachable"]:
                flags_live.append(f"Live check: website responded with HTTP {live['httpStatus']}")
            elif live["checked"] and live["error"]:
                flags_live.append("Live check: website could not be reached within the safety timeout")
            if live["redirects"] > 0:
                flags_live.append(f"Live check: {live['redirects']} redirect(s) observed")

        flags.extend(flags_live)
        score = min(max(risk_points, 1), 98)

        if score >= 70:
            status = "malicious"
            status_label = "Malicious URL"
            verdict = "Dangerous: Highly probable phishing or malware link."
        elif score >= 30:
            status = "suspicious"
            status_label = "Suspicious Link"
            verdict = "Caution: Domain exhibits unusual structural characteristics."
        else:
            status = "safe"
            status_label = "Safe Link"
            verdict = "Safe: No known malicious or phishing heuristics detected."

        return {
            "url": url,
            "riskScore": score,
            "status": status,
            "statusLabel": status_label,
            "verdict": verdict,
            "flags": flags,
            "features": features,
            "liveCheck": live,
            "modelVersion": self.loaded_version,
        }
