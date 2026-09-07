"""
URL Lexical, Entropy & Domain Structural Feature Extractor.
"""
import math
import re
from urllib.parse import urlparse
from typing import Any, Dict, List, Optional


class URLExtractor:
    """Extracts numerical feature vectors from raw URL strings."""

    SUSPICIOUS_KEYWORDS = [
        "login", "secure", "verify", "update", "account",
        "banking", "free", "bonus", "claim", "wallet", "kyc", "signin",
    ]

    SUSPICIOUS_TLDS = [
        ".xyz", ".top", ".info", ".live", ".cc", ".club", ".online", ".tk", ".ml",
    ]

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}

    @staticmethod
    def calculate_entropy(text: str) -> float:
        """Calculates Shannon entropy of string to detect randomized/generated domains."""
        if not text:
            return 0.0
        prob = [float(text.count(c)) / len(text) for c in dict.fromkeys(list(text))]
        return -sum([p * math.log(p) / math.log(2.0) for p in prob])

    def extract_features_single(self, url: str) -> Dict[str, Any]:
        """Extracts tabular feature dictionary from a single URL string."""
        url = url.strip()
        if not url.startswith(("http://", "https://")):
            url = "http://" + url

        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        path = parsed.path.lower()
        query = parsed.query.lower()

        has_ip = 1 if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$", domain) else 0
        has_suspicious_tld = 1 if any(domain.endswith(tld) for tld in self.SUSPICIOUS_TLDS) else 0

        full_url_lower = url.lower()
        keyword_count = sum(1 for kw in self.SUSPICIOUS_KEYWORDS if kw in full_url_lower)
        has_login = 1 if any(kw in full_url_lower for kw in ["login", "signin", "bank", "account"]) else 0

        features = {
            "url_length": len(url),
            "domain_length": len(domain),
            "path_length": len(path),
            "num_dots": url.count("."),
            "num_hyphens": url.count("-"),
            "num_at_symbols": url.count("@"),
            "num_subdomains": max(0, domain.count(".") - 1),
            "has_at_symbol": 1 if url.count("@") > 0 else 0,
            "num_question_marks": url.count("?"),
            "num_equal_signs": url.count("="),
            "num_slashes": url.count("/"),
            "num_digits": sum(c.isdigit() for c in url),
            "is_ip": has_ip,
            "has_ip_address": has_ip,
            "is_https": 1 if parsed.scheme == "https" else 0,
            "has_suspicious_tld": has_suspicious_tld,
            "has_login_keyword": has_login,
            "keyword_count": keyword_count,
            "entropy": round(self.calculate_entropy(domain), 4),
        }
        return features

    extract_features = extract_features_single

    def extract_features_dataframe(self, urls: List[str]):
        try:
            import pandas as pd
            records = [self.extract_features_single(u) for u in urls]
            return pd.DataFrame(records)
        except ImportError:
            return [self.extract_features_single(u) for u in urls]
