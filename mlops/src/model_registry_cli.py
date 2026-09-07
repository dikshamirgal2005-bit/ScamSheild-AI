"""
model_registry_cli.py
---------------------
Command-line interface for the ScamShield AI Model Registry.
Allows tracking model versions, training dates, dataset versions, evaluation metrics,
stage status (Development, Testing, Production, Archived), and identifying active backend models.
"""
import argparse
import sys
from pathlib import Path

# Add mlops root to sys.path
mlops_root = Path(__file__).resolve().parent.parent
if str(mlops_root) not in sys.path:
    sys.path.insert(0, str(mlops_root))

from src.common.registry import ModelRegistry


def main():
    parser = argparse.ArgumentParser(
        description="ScamShield AI - Model Registry CLI"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all registered models, versions, training dates, dataset versions, and stage status",
    )
    parser.add_argument(
        "--active",
        action="store_true",
        help="Identify which model versions are currently active and served by the backend",
    )
    parser.add_argument(
        "--info",
        action="store_true",
        help="Display detailed metadata for a specific model version",
    )
    parser.add_argument(
        "--promote",
        action="store_true",
        help="Promote a model version to a stage (Development, Testing, Production, Archived)",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate a model version against performance thresholds and production champion model",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Bypass validation checks when promoting model to Production",
    )
    parser.add_argument(
        "--model",
        type=str,
        help="Model name (e.g. message_model, scam_type_model, url_model)",
    )
    parser.add_argument(
        "--version",
        type=str,
        default="latest",
        help="Version identifier (e.g. v1.0.0 or 'latest')",
    )
    parser.add_argument(
        "--stage",
        type=str,
        choices=["Development", "Testing", "Production", "Archived"],
        default="Production",
        help="Stage status to promote model version to (default: Production)",
    )

    args = parser.parse_args()
    registry = ModelRegistry(models_dir=str(mlops_root / "models"))

    if args.list:
        models = registry.list_models(model_name=args.model)
        if not models:
            print("No models registered in registry.")
            return

        print("\n=== ScamShield AI Model Registry ===")
        header = f"{'Model Name':<18} {'Version':<10} {'Dataset Ver':<12} {'Training Date':<22} {'Stage Status':<14} {'Production?'}"
        print("-" * len(header))
        print(header)
        print("-" * len(header))

        for m in models:
            prod_flag = "[ACTIVE PROD]" if m["is_production"] else (" [LATEST]" if m["is_latest"] else " ")
            tr_date = (m["training_date"] or "")[:19]
            print(
                f"{m['model_name']:<18} {m['version']:<10} {m['dataset_version']:<12} {tr_date:<22} {m['status']:<14} {prod_flag}"
            )
        print("-" * len(header))
        print(f"Total model versions registered: {len(models)}\n")

    elif args.active:
        active_models = registry.get_backend_active_models()
        print("\n=== Active Models Used by Backend Microservice ===")
        if not active_models:
            print("No active production models set.")
            return

        header = f"{'Model Name':<18} {'Active Version':<16} {'Stage Status':<14} {'Dataset Ver':<12} {'Training Date'}"
        print("-" * len(header))
        print(header)
        print("-" * len(header))

        for m_name, info in active_models.items():
            tr_date = (info.get("training_date") or "")[:19]
            status_str = "Production" if info.get("is_production") else f"{info.get('status')} (Fallback)"
            print(
                f"{m_name:<18} {info['active_version']:<16} {status_str:<14} {info['dataset_version']:<12} {tr_date}"
            )
        print("-" * len(header))
        print("Backend is ready to serve predictions using the above active versions.\n")

    elif args.info:
        if not args.model:
            print("Error: --model argument is required for --info.")
            sys.exit(1)

        try:
            _, meta = registry.get_model(args.model, version=args.version)
            print(f"\n=== Model Registry Record: {args.model} ({meta['version']}) ===")
            print(f"Model Name     : {meta['model_name']}")
            print(f"Version        : {meta['version']}")
            print(f"Stage Status   : {meta['status']}")
            print(f"Dataset Version: {meta['dataset_version']}")
            print(f"Training Date  : {meta.get('training_date', meta.get('created_at'))}")
            print(f"Artifacts Path : {meta.get('artifacts_path')}")
            print(f"Metrics        : {meta.get('metrics', {})}")
            if "evaluation_results" in meta:
                print(f"Evaluation Res : {meta['evaluation_results']}")
            print("===================================================\n")
        except Exception as e:
            print(f"Error fetching model registry record: {e}")
            sys.exit(1)

    elif args.validate:
        if not args.model:
            print("Error: --validate requires --model argument.")
            sys.exit(1)

        from src.common.validator import ModelValidator
        validator = ModelValidator(models_dir=str(mlops_root / "models"))
        target_version = args.version
        if target_version == "latest":
            try:
                _, meta = registry.get_model(args.model, version="latest")
                target_version = meta["version"]
            except Exception as e:
                print(f"Error fetching model '{args.model}': {e}")
                sys.exit(1)

        val_res = validator.validate_model(args.model, target_version)
        status_label = "PASSED" if val_res["is_valid"] else "REJECTED"

        print(f"\n=== Model Validation Report: {args.model} ({target_version}) ===")
        print(f"Validation Status: {status_label}")
        print(f"Primary Metric   : {val_res['primary_metric']}")
        print(f"Metrics Evaluated: {val_res['metrics_evaluated']}")
        print(f"Min Thresholds   : {val_res['min_thresholds_applied']}")
        if val_res.get("champion_version"):
            print(f"Prod Champion    : Version {val_res['champion_version']} ({val_res['primary_metric']} = {val_res['champion_metric']})")
        if val_res["rejection_reasons"]:
            print("Rejection Reasons:")
            for reason in val_res["rejection_reasons"]:
                print(f"  - {reason}")
        print("========================================================\n")

    elif args.promote:
        if not args.model or args.version == "latest":
            print("Error: --promote requires --model and a specific --version (e.g. v1.0.0).")
            sys.exit(1)

        try:
            meta = registry.promote_model(
                args.model, version=args.version, stage=args.stage, force=args.force
            )
            print(f"\nSuccessfully promoted model '{args.model}' version '{args.version}' to stage '{meta['status']}'.")
            if meta['status'] == "Production":
                print(f"Backend will now serve predictions using {args.model} version {args.version}.\n")
        except Exception as e:
            print(f"Error promoting model version: {e}")
            sys.exit(1)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
