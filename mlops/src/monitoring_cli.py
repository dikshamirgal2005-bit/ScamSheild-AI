"""
monitoring_cli.py
------------------
CLI tool to inspect ScamShield AI model prediction telemetry and monitoring statistics.
Shows anonymized prediction logs, confidence averages, latency metrics, and version usage.
"""
import argparse
import sys
from pathlib import Path

# Add mlops root to sys.path
mlops_root = Path(__file__).resolve().parent.parent
if str(mlops_root) not in sys.path:
    sys.path.insert(0, str(mlops_root))

from src.common.monitor import PredictionMonitor


def main():
    parser = argparse.ArgumentParser(description="ScamShield AI - Model Monitoring CLI")
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Display aggregated prediction telemetry summary and risk statistics",
    )
    parser.add_argument(
        "--logs",
        action="store_true",
        help="Display recent anonymized prediction log entries",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Maximum number of log entries to display (default: 10)",
    )

    args = parser.parse_args()
    monitor = PredictionMonitor(log_dir=str(mlops_root / "logs"))

    if args.summary or (not args.logs):
        stats = monitor.get_summary_stats()
        print("\n=== ScamShield AI - Model Prediction Monitoring Summary ===")
        print(f"Total Predictions Logged: {stats['total_predictions']}")
        print(f"Average Risk Score      : {stats['avg_risk_score']} / 100")
        print(f"Average Confidence      : {stats['avg_confidence']}")
        print(f"Average Execution Latency: {stats['avg_execution_time_ms']} ms")
        print(f"Input Type Breakdown    : {stats['input_type_breakdown']}")
        print(f"Status Distribution     : {stats['status_distribution']}")
        print("Models & Versions Active:")
        for mname, minfo in stats.get("models_monitored", {}).items():
            print(f"  - {mname:<18}: Version {minfo['active_version']} ({minfo['count']} predictions logged)")
        print("-" * 60)
        print(f"Privacy Policy: {stats['privacy_notice']}\n")

    if args.logs:
        logs = monitor.read_logs(limit=args.limit)
        print(f"\n=== Recent Anonymized Prediction Logs (Last {len(logs)} entries) ===")
        if not logs:
            print("No prediction logs recorded yet.")
            return

        header = f"{'Timestamp':<24} {'Type':<10} {'Model Name':<16} {'Ver':<8} {'Status':<12} {'Risk':<5} {'Latency':<8} {'Hash'}"
        print("-" * len(header))
        print(header)
        print("-" * len(header))
        for r in logs:
            ts = (r.get("timestamp") or "")[:19]
            print(
                f"{ts:<24} {r.get('input_type'):<10} {r.get('model_name'):<16} {r.get('model_version'):<8} "
                f"{r.get('status'):<12} {r.get('risk_score'):<5} {r.get('execution_time_ms'):<8} {r.get('anonymized_hash')}"
            )
        print("-" * len(header) + "\n")


if __name__ == "__main__":
    main()
