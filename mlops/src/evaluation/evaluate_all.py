"""
evaluate_all.py
---------------
Master evaluation CLI runner for ScamShield AI machine learning models.
Evaluates trained models against test datasets, generates accuracy, precision, recall,
F1, and confusion matrix scorecards, and saves evaluation_results.json.
"""
import argparse
import json
import sys
from pathlib import Path

# Add mlops root to sys.path
mlops_root = Path(__file__).resolve().parent.parent.parent
if str(mlops_root) not in sys.path:
    sys.path.insert(0, str(mlops_root))

from src.evaluation.evaluate_message import MessageEvaluator
from src.evaluation.evaluate_scam_type import ScamTypeEvaluator
from src.evaluation.evaluate_url import URLEvaluator
from src.common.registry import ModelRegistry


EVALUATOR_MAP = {
    "message": MessageEvaluator,
    "scam_type": ScamTypeEvaluator,
    "url": URLEvaluator,
}


def run_evaluation(model_type: str, version: str) -> None:
    """Executes evaluation for a single model and prints results."""
    evaluator_cls = EVALUATOR_MAP[model_type]
    evaluator = evaluator_cls()

    print(f"\n==========================================")
    print(f"Executing Evaluation: {model_type.upper()} MODEL")
    print(f"Target Version: {version}")
    print(f"==========================================")

    res = evaluator.evaluate_version(version=version)

    print(f"Model Name       : {res['model_name']}")
    print(f"Version          : {res['version']}")
    print(f"Evaluated At     : {res['evaluated_at']}")
    print(f"Data Source      : {res['data_source']}")
    print(f"Test Samples     : {res['num_test_samples']}")
    print(f"Metrics Scorecard:")
    for metric_name, val in res["metrics"].items():
        print(f"  - {metric_name:<18}: {val}")

    cm = res.get("confusion_matrix", {})
    if "matrix" in cm:
        print(f"Confusion Matrix :")
        for row in cm["matrix"]:
            print(f"  {row}")
    print("Done.")


def main():
    parser = argparse.ArgumentParser(
        description="ScamShield AI - Automated Model Evaluation CLI"
    )
    parser.add_argument(
        "--model",
        type=str,
        choices=["message", "scam_type", "url"],
        help="Evaluate a specific model version independently",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Evaluate all three model versions sequentially",
    )
    parser.add_argument(
        "--version",
        type=str,
        default="v1.0.0",
        help="Target model version identifier to evaluate (default: v1.0.0)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="Display evaluation scorecards for all registered models",
    )

    args = parser.parse_args()

    if args.list:
        models_dir = mlops_root / "models"
        registry = ModelRegistry(models_dir=str(models_dir))
        models = registry.list_models()

        if not models:
            print("No models registered yet.")
            return

        print("\n=== Model Evaluation Scorecards ===")
        header = f"{'Model Name':<20} {'Version':<10} {'F1 Score':<10} {'Accuracy':<10} {'Status':<12}"
        print("-" * len(header))
        print(header)
        print("-" * len(header))

        for m in models:
            m_name = m["model_name"]
            v_name = m["version"]
            eval_file = models_dir / m_name / v_name / "evaluation_results.json"

            if eval_file.exists():
                with open(eval_file, "r", encoding="utf-8") as f:
                    eval_data = json.load(f)
                metrics = eval_data.get("metrics", {})
                f1_val = metrics.get("f1", metrics.get("macro_f1", "N/A"))
                acc_val = metrics.get("accuracy", "N/A")
                status = eval_data.get("status", "evaluated")
            else:
                f1_val = m.get("metrics", {}).get("f1", m.get("metrics", {}).get("val_f1", "N/A"))
                acc_val = m.get("metrics", {}).get("accuracy", m.get("metrics", {}).get("train_accuracy", "N/A"))
                status = "trained"

            print(f"{m_name:<20} {v_name:<10} {str(f1_val):<10} {str(acc_val):<10} {status:<12}")
        print("-" * len(header))
        print(f"Total model versions listed: {len(models)}\n")

    elif args.all:
        for model_key in ["message", "scam_type", "url"]:
            run_evaluation(model_type=model_key, version=args.version)
        print("\nAll model evaluations completed successfully.\n")

    elif args.model:
        run_evaluation(model_type=args.model, version=args.version)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
