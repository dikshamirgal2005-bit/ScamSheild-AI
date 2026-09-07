"""
feedback_cli.py
----------------
CLI tool to inspect user feedback (Correct/Incorrect) and export prepared retraining datasets.
"""
import argparse
import sys
from pathlib import Path

# Add mlops root to sys.path
mlops_root = Path(__file__).resolve().parent.parent
if str(mlops_root) not in sys.path:
    sys.path.insert(0, str(mlops_root))

from src.common.feedback import FeedbackManager


def main():
    parser = argparse.ArgumentParser(description="ScamShield AI - User Feedback & Retraining Dataset CLI")
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Display summary statistics of user feedback and model accuracy",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="Display recent feedback submissions",
    )
    parser.add_argument(
        "--export",
        action="store_true",
        help="Export prepared user feedback samples into a labeled JSON dataset for model retraining",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="message_model",
        help="Target model name for dataset export ('message_model', 'scam_type_model', 'url_model')",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Maximum entries to list (default: 10)",
    )

    args = parser.parse_args()
    mgr = FeedbackManager(feedback_dir=str(mlops_root / "data" / "feedback"))

    if args.export:
        res = mgr.export_retraining_dataset(model_name=args.model)
        print(f"\n=== Retraining Dataset Export Completed ===")
        print(f"Target Model    : {res['model_name']}")
        print(f"Exported Samples: {res['exported_samples']}")
        print(f"Destination Path: {res['output_path']}")
        print("Note: The exported JSON dataset can be merged into future training data splits without automatic retraining.\n")

    elif args.list:
        entries = mgr.read_feedback(limit=args.limit)
        print(f"\n=== Recent User Feedback Submissions (Last {len(entries)} entries) ===")
        if not entries:
            print("No user feedback submitted yet.")
            return

        header = f"{'Feedback ID':<16} {'Model Name':<16} {'Version':<8} {'Feedback':<10} {'Predicted':<12} {'Target Label':<12} {'Status'}"
        print("-" * len(header))
        print(header)
        print("-" * len(header))
        for r in entries:
            print(
                f"{r.get('feedback_id'):<16} {r.get('model_name'):<16} {r.get('model_version'):<8} "
                f"{r.get('user_feedback'):<10} {r.get('predicted_label'):<12} {r.get('target_label'):<12} {r.get('status')}"
            )
        print("-" * len(header) + "\n")

    else:
        summary = mgr.get_feedback_summary()
        print("\n=== ScamShield AI - User Feedback & Retraining Summary ===")
        print(f"Total Submissions         : {summary['total_feedback_submissions']}")
        print(f"Total Marked Correct      : {summary['total_correct']}")
        print(f"Total Marked Incorrect    : {summary['total_incorrect']}")
        print(f"Overall Accuracy Rate     : {summary['overall_accuracy_rate'] * 100:.1f}%")
        print(f"Retraining Samples Ready  : {summary['retraining_candidates_ready']}")
        print("Model Version Breakdown:")
        for mname, mdata in summary.get("feedback_by_model", {}).items():
            acc = mdata.get("accuracy_rate", 1.0) * 100
            print(
                f"  - {mname:<18} (Version {mdata['model_version']}): "
                f"{mdata['correct']}/{mdata['total']} correct ({acc:.1f}% user accuracy)"
            )
        print("===========================================================\n")


if __name__ == "__main__":
    main()
