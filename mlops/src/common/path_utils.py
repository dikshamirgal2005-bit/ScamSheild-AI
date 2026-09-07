"""
path_utils.py
-------------
Canonical path resolution utilities and root directory definition for ScamShield AI MLOps.
"""
from pathlib import Path

MLOPS_ROOT = Path(__file__).resolve().parent.parent.parent


def resolve_path(path_str: str | Path) -> Path:
    """Resolves relative and absolute paths canonically within the mlops repository."""
    p = Path(path_str)
    if p.is_absolute():
        if p.exists():
            return p.resolve()
        return p
    
    # Try directly under MLOPS_ROOT
    candidate = (MLOPS_ROOT / p).resolve()
    if candidate.exists():
        return candidate
        
    # If path starts with mlops/ or mlops\, try stripping that prefix
    parts = p.parts
    if parts and parts[0].lower() == "mlops":
        stripped = MLOPS_ROOT.joinpath(*parts[1:]).resolve()
        if stripped.exists():
            return stripped
            
    return candidate

