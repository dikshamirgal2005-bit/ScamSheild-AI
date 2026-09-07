"""
dashboard_cli.py
----------------
CLI interface to inspect ScamShield AI MLOps Dashboard and export HTML reports.
"""
import argparse
import json
import sys
from pathlib import Path

# Add mlops root to sys.path
mlops_root = Path(__file__).resolve().parent.parent
if str(mlops_root) not in sys.path:
    sys.path.insert(0, str(mlops_root))

from src.common.dashboard import dashboard_service


def main():
    parser = argparse.ArgumentParser(description="ScamShield AI - MLOps Monitoring Dashboard CLI")
    parser.add_argument("--json", action="store_true", help="Print dashboard summary as JSON")
    parser.add_argument("--export-html", type=str, default=None, help="Export dashboard to an HTML file")
    args = parser.parse_args()

    summary = dashboard_service.get_dashboard_summary()

    if args.export_html:
        out_path = Path(args.export_html)
        html_content = dashboard_service.render_html()
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"[OK] Dashboard exported to HTML: {out_path.resolve()}")
        return

    if args.json:
        print(json.dumps(summary, indent=2))
        return

    # Formatted Terminal View
    s = summary["summary"]
    print("\n" + "=" * 78)
    print("      [SCAMSHIELD AI] MLOPS MONITORING DASHBOARD")
    print("=" * 78)
    print(f"  Active Production Models: {s['production_models_count']}/{s['total_models_tracked']}")
    print(f"  Dataset Versions Tracked : {s['dataset_versions_count']}")
    print(f"  Total Predictions Logged : {s['total_predictions_logged']}")
    print(f"  Feedback Submissions     : {s['total_feedback_submissions']} (Accuracy: {s['user_accuracy_rate']*100:.1f}%)")
    print(f"  Retraining Candidates    : {s['retraining_candidates_ready']}")
    print("=" * 78)

    print("\n[1] MODEL REGISTRY & PERFORMANCE SCORECARDS")
    print("-" * 78)
    print(f"{'Model Name':<18} {'Ver':<8} {'Status':<12} {'Dataset':<10} {'Acc':<8} {'Prec':<8} {'Rec':<8} {'F1':<8}")
    print("-" * 78)
    for m in summary["models"]:
        met = m["metrics"]
        print(
            f"{m['model_name']:<18} {m['version']:<8} {m['status']:<12} {m['dataset_version']:<10} "
            f"{met['accuracy']*100:>5.1f}%  {met['precision']*100:>5.1f}%  {met['recall']*100:>5.1f}%  {met['f1']:>6.4f}"
        )

    print("\n[2] DATASET VERSIONING CATALOG")
    print("-" * 78)
    print(f"{'Dataset Name':<16} {'Version':<10} {'Records':<10} {'Format':<8} {'Checksum (SHA-256)':<24}")
    print("-" * 78)
    for d in summary["datasets"]:
        chk = d["checksum_sha256"][:18] + "..." if len(d["checksum_sha256"]) > 18 else d["checksum_sha256"]
        print(f"{d['dataset_name']:<16} {d['version']:<10} {d['num_records']:<10} {d['file_format']:<8} {chk:<24}")

    print("\n[3] PREDICTION TELEMETRY & FEEDBACK")
    print("-" * 78)
    telem = summary["predictions_telemetry"]
    print(f"  Total Inferences Logged : {telem.get('total_predictions', 0)}")
    print(f"  Average Risk Score      : {telem.get('avg_risk_score', 0)}/100")
    print(f"  Average Execution Time  : {telem.get('avg_execution_time_ms', 0):.2f} ms")
    print(f"  Risk Status Breakdown   : {telem.get('status_distribution', {})}")
    fb = summary["feedback_statistics"]
    print(f"  User Feedback Correct   : {fb.get('total_correct', 0)}")
    print(f"  User Feedback Incorrect : {fb.get('total_incorrect', 0)}")
    print("=" * 78 + "\n")


if __name__ == "__main__":
    main()
