"""
train_all.py
------------
Master training execution script for ScamShield AI machine learning pipelines.
Allows independent training of Message, Scam-Type, and URL models, or sequential
batch training with unified model registration and metrics logging.
"""
import argparse
import json
import sys
from pathlib import Path

# Add mlops root to sys.path
mlops_root = Path(__file__).resolve().parent.parent.parent
if str(mlops_root) not in sys.path:
    sys.path.insert(0, str(mlops_root))

from src.training.train_message import MessageTrainer
from src.training.train_scam_type import ScamTypeTrainer
from src.training.train_url import URLTrainer
from src.common.registry import ModelRegistry


TRAINER_MAP = {
    "message": MessageTrainer,
    "scam_type": ScamTypeTrainer,
    "url": URLTrainer,
}


def run_training(model_type: str, version: str) -> None:
    """Executes a single model trainer and outputs results."""
    trainer_cls = TRAINER_MAP[model_type]
    trainer = trainer_cls(version=version)

    print(f"\n==========================================")
    print(f"Executing Training: {model_type.upper()} MODEL")
    print(f"Target Version: {version}")
    print(f"==========================================")

    results = trainer.run()

    print(f"Model Name     : {results['model_name']}")
    print(f"Version        : {results['version']}")
    print(f"Artifacts Dir  : {results['artifacts_dir']}")
    print(f"Key Metrics    :")
    for metric_name, val in results["metrics"].items():
        print(f"  - {metric_name:<18}: {val}")
    print("Done.")


def main():
    parser = argparse.ArgumentParser(
        description="ScamShield AI - Model Training Pipeline Runner"
    )
    parser.add_argument(
        "--model",
        type=str,
        choices=["message", "scam_type", "url"],
        help="Train a specific model independently",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Train all three models sequentially",
    )
    parser.add_argument(
        "--version",
        type=str,
        default="v1.0.0",
        help="Semantic version identifier for the trained model artifacts (default: v1.0.0)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all registered models in the ModelRegistry catalog",
    )

    args = parser.parse_args()

    if args.list:
        registry = ModelRegistry(models_dir=str(mlops_root / "models"))
        models = registry.list_models()
        if not models:
            print("No models registered yet.")
            return

        print("\n=== Registered Trained Models ===")
        header = f"{'Model Name':<20} {'Version':<10} {'Created At':<22} {'Latest?'}"
        print("-" * len(header))
        print(header)
        print("-" * len(header))
        for m in models:
            is_latest_str = "[YES]" if m["is_latest"] else " "
            print(f"{m['model_name']:<20} {m['version']:<10} {m['created_at'][:19]:<22} {is_latest_str}")
        print("-" * len(header))
        print(f"Total model versions found: {len(models)}\n")

    elif args.all:
        for model_key in ["message", "scam_type", "url"]:
            run_training(model_type=model_key, version=args.version)
        print("\nAll model training pipelines completed successfully.\n")

    elif args.model:
        run_training(model_type=args.model, version=args.version)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
