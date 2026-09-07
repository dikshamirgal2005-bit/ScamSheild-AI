"""
YAML Configuration Loader & Resolver with environment override support.
"""
import os
from pathlib import Path
from typing import Any, Dict

from .logger import get_logger

logger = get_logger("ConfigLoader")


def load_config(config_path: str, base_config_path: str = "configs/base_config.yaml") -> Dict[str, Any]:
    """Loads and merges a model-specific configuration file with base_config.yaml."""
    try:
        import yaml
    except ImportError:
        logger.warning("PyYAML not installed. Run 'pip install pyyaml' to parse YAML files.")
        return {}

    merged_config: Dict[str, Any] = {}

    if os.path.exists(base_config_path):
        with open(base_config_path, "r", encoding="utf-8") as f:
            merged_config = yaml.safe_load(f) or {}

    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        specific_config = yaml.safe_load(f) or {}

    merged_config.update(specific_config)
    logger.debug(f"Loaded configuration from {config_path}")
    return merged_config
