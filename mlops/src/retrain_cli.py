"""
retrain_cli.py
--------------
CLI interface for ScamShield AI Controlled Model Retraining Pipeline.
Runs end-to-end retraining: Feedback Ingestion -> Dataset Snapshot -> Preprocessing -> Candidate Training -> Evaluation -> Champion Validation -> Promotion/Rejection.
"""
import argparse
import sys
from pathlib import Path

# Add mlops root to sys.path
mlops_root = Path(__file__).resolve().parent.parent
if str(mlops_root) not in sys.path:
    sys.path.insert(0, str(mlops_root))

from src.training.retrain_pipeline import RetrainPipeline


def main():
    parser = argparse.ArgumentParser(description="ScamShield AI - Controlled Model Retraining CLI")
    parser.add_argument(
        "--model",
        type=str,
        choices=["message_model", "scam_type_model", "url_model"],
        help="Target model name for controlled retraining",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Run controlled retraining pipeline across all three model pipelines sequentially",
    )
    parser.add_argument(
        "--dataset-version",
        type=str,
        default="v1.1.0",
        help="Version tag for new retraining dataset snapshot (default: v1.1.0)",
    )
    parser.add_argument(
        "--model-version",
        type=str,
        default="v1.1.0",
        help="Version tag for candidate trained model (default: v1.1.0)",
    )
    parser.add_argument(
        "--no-feedback",
        action="store_true",
        help="Exclude user feedback data from new dataset version snapshot",
    )

    args = parser.parse_args()
    pipeline = RetrainPipeline(root_dir=mlops_root)

    models_to_run = ["message_model", "scam_type_model", "url_model"] if args.all else ([args.model] if args.model else [])

    if not models_to_run:
        parser.print_help()
        sys.exit(1)

    print("\n" + "=" * 70)
    print("  ScamShield AI - Controlled Model Retraining Pipeline")
    print("=" * 70)

    for m_name in models_to_run:
        print(f"\n--> Initiating controlled retraining for '{m_name}'...")
        try:
            res = pipeline.retrain_model(
                model_name=m_name,
                new_dataset_version=args.dataset_version,
                new_model_version=args.model_version,
                include_feedback=not args.no_feedback,
                auto_promote_if_valid=True,
            )

            print(f"==========================================================")
            print(f"Retraining Result for Model : {res['model_name']}")
            print(f"Dataset Version Created    : {res['dataset_version']}")
            print(f"Candidate Model Version    : {res['model_version']}")
            print(f"Feedback Samples Merged    : {res['feedback_samples_added']}")
            print(f"Validation Status          : {'PASSED' if res['is_valid'] else 'REJECTED'}")
            print(f"Final Stage Status         : {res['final_stage_status']}")
            if res['promoted_to_production']:
                print(f"--> [SUCCESS] Candidate model promoted to Production stage! Active production updated.")
            else:
                print(f"--> [NOTICE] Candidate model failed validation rules or champion comparison.")
                print(f"    Rejection Reasons: {'; '.join(res['rejection_reasons'])}")
                print(f"    Active Production champion remains unchanged.")
            print(f"==========================================================")
        except Exception as e:
            print(f"[ERROR] Retraining pipeline failed for {m_name}: {e}")
            sys.exit(1)

    print("\nControlled retraining execution completed.\n")


if __name__ == "__main__":
    main()
