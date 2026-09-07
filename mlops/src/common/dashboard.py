"""
dashboard.py
------------
Aggregated MLOps Monitoring Dashboard Service for ScamShield AI.
Combines:
  - Versioned Datasets metadata from DatasetRegistry
  - Model versions, stage lifecycle status, and evaluation metrics (Accuracy, Precision, Recall, F1) from ModelRegistry
  - Real-time anonymized prediction telemetry from PredictionMonitor
  - User feedback loop submissions and accuracy rates from FeedbackManager
"""
from typing import Any, Dict, List, Optional
from pathlib import Path

from src.common.dataset_registry import DatasetRegistry
from src.common.feedback import FeedbackManager
from src.common.logger import get_logger
from src.common.monitor import PredictionMonitor
from src.common.path_utils import MLOPS_ROOT, resolve_path
from src.common.registry import ModelRegistry
from src.common.validator import ModelValidator

logger = get_logger("DashboardService")


class DashboardService:
    """Aggregates end-to-end MLOps telemetry, model registry, dataset catalog, and feedback loop statistics."""

    def __init__(
        self,
        root_dir: Optional[str | Path] = None,
    ):
        self.root_dir = resolve_path(root_dir or MLOPS_ROOT)
        self.dataset_registry = DatasetRegistry(versions_dir=self.root_dir / "data" / "versions")
        self.model_registry = ModelRegistry(models_dir=self.root_dir / "models")
        self.validator = ModelValidator(models_dir=self.root_dir / "models")
        self.prediction_monitor = PredictionMonitor(log_dir=self.root_dir / "logs")
        self.feedback_manager = FeedbackManager(feedback_dir=self.root_dir / "data" / "feedback")

    def get_dashboard_summary(self) -> Dict[str, Any]:
        """Gathers and compiles complete system metrics for UI display and reporting."""
        # 1. Datasets
        raw_datasets = self.dataset_registry.list_datasets()
        datasets: List[Dict[str, Any]] = []
        for d in raw_datasets:
            datasets.append({
                "dataset_name": d.get("dataset_name"),
                "version": d.get("version"),
                "is_latest": d.get("is_latest", False),
                "num_records": d.get("num_records", 0),
                "creation_date": d.get("creation_date", "N/A"),
                "features": d.get("features", []),
                "file_format": d.get("file_format", "json"),
                "checksum_sha256": d.get("checksum_sha256", "N/A"),
                "description": d.get("description", ""),
            })

        # 2. Models & Performance Metrics
        raw_models = self.model_registry.list_models()
        models: List[Dict[str, Any]] = []
        for m in raw_models:
            m_name = m.get("model_name", "")
            m_ver = m.get("version", "")
            metrics = self.validator.get_candidate_metrics(m_name, m_ver)

            # Extract primary metrics
            accuracy = metrics.get("accuracy", metrics.get("train_accuracy", 0.0))
            precision = metrics.get("precision", metrics.get("val_precision", metrics.get("macro_precision", 0.0)))
            recall = metrics.get("recall", metrics.get("val_recall", metrics.get("macro_recall", 0.0)))
            f1 = metrics.get("f1", metrics.get("val_f1", metrics.get("macro_f1", 0.0)))
            roc_auc = metrics.get("roc_auc", None)

            models.append({
                "model_name": m_name,
                "version": m_ver,
                "status": m.get("status", "Development"),
                "is_production": m.get("is_production", False),
                "is_latest": m.get("is_latest", False),
                "dataset_version": m.get("dataset_version", "v1.0.0"),
                "training_date": m.get("training_date", "N/A"),
                "metrics": {
                    "accuracy": round(float(accuracy), 4) if accuracy is not None else 0.0,
                    "precision": round(float(precision), 4) if precision is not None else 0.0,
                    "recall": round(float(recall), 4) if recall is not None else 0.0,
                    "f1": round(float(f1), 4) if f1 is not None else 0.0,
                    "roc_auc": round(float(roc_auc), 4) if (roc_auc is not None and str(roc_auc).lower() != "nan") else None,
                },
                "path": m.get("path"),
            })

        # 3. Active Backend Models Map
        active_backend = self.model_registry.get_backend_active_models()

        # 4. Prediction Telemetry
        telemetry = self.prediction_monitor.get_summary_stats()

        # 5. Feedback Loop Stats
        feedback = self.feedback_manager.get_feedback_summary()

        return {
            "summary": {
                "total_models_tracked": len(models),
                "production_models_count": sum(1 for m in models if m["is_production"]),
                "dataset_versions_count": len(datasets),
                "total_predictions_logged": telemetry.get("total_predictions", 0),
                "total_feedback_submissions": feedback.get("total_feedback_submissions", 0),
                "user_accuracy_rate": feedback.get("overall_accuracy_rate", 1.0),
                "retraining_candidates_ready": feedback.get("retraining_candidates_ready", 0),
            },
            "models": models,
            "active_production_models": active_backend,
            "datasets": datasets,
            "predictions_telemetry": telemetry,
            "feedback_statistics": feedback,
        }

    def render_html(self) -> str:
        """Renders an interactive HTML dashboard suitable for web presentation and demo."""
        data = self.get_dashboard_summary()
        summary = data["summary"]
        models = data["models"]
        datasets = data["datasets"]
        telemetry = data["predictions_telemetry"]
        feedback = data["feedback_statistics"]

        model_rows_html = ""
        for m in models:
            status_badge_class = {
                "Production": "badge-prod",
                "Testing": "badge-test",
                "Development": "badge-dev",
                "Rejected": "badge-rejected",
                "Archived": "badge-archived",
            }.get(m["status"], "badge-dev")

            m_metrics = m["metrics"]
            acc = f"{m_metrics['accuracy'] * 100:.1f}%"
            prec = f"{m_metrics['precision'] * 100:.1f}%"
            rec = f"{m_metrics['recall'] * 100:.1f}%"
            f1 = f"{m_metrics['f1']:.4f}"

            model_rows_html += f"""
            <tr>
                <td><strong>{m['model_name']}</strong></td>
                <td><code>{m['version']}</code></td>
                <td><span class=\"badge {status_badge_class}\">{m['status']}</span></td>
                <td><code>{m['dataset_version']}</code></td>
                <td class=\"num\">{acc}</td>
                <td class=\"num\">{prec}</td>
                <td class=\"num\">{rec}</td>
                <td class=\"num font-bold text-accent\">{f1}</td>
                <td class=\"date\">{m['training_date'][:19] if m['training_date'] != 'N/A' else 'N/A'}</td>
            </tr>
            """

        dataset_rows_html = ""
        for d in datasets:
            latest_badge = '<span class=\"badge badge-latest\">Latest</span>' if d.get("is_latest") else ""
            dataset_rows_html += f"""
            <tr>
                <td><strong>{d['dataset_name']}</strong> {latest_badge}</td>
                <td><code>{d['version']}</code></td>
                <td class=\"num\">{d['num_records']}</td>
                <td><span class=\"format-tag\">{d['file_format'].upper()}</span></td>
                <td title=\"{d['checksum_sha256']}\"><code>{d['checksum_sha256'][:14]}...</code></td>
                <td class=\"text-subtle\">{d['description']}</td>
                <td class=\"date\">{d['creation_date'][:19] if d['creation_date'] != 'N/A' else 'N/A'}</td>
            </tr>
            """

        status_dist_html = ""
        for st, cnt in telemetry.get("status_distribution", {}).items():
            status_dist_html += f"""
            <div class=\"stat-pill\">
                <span class=\"pill-label\">{st.capitalize()}</span>
                <span class=\"pill-val\">{cnt}</span>
            </div>
            """
        if not status_dist_html:
            status_dist_html = "<span class='text-subtle'>No prediction status telemetry recorded yet.</span>"

        fb_by_model_html = ""
        for m_name, fb_data in feedback.get("feedback_by_model", {}).items():
            acc_rate = f"{fb_data.get('accuracy_rate', 1.0) * 100:.1f}%"
            fb_by_model_html += f"""
            <div class=\"model-fb-card\">
                <div class=\"fb-card-title\">{m_name} (<code>{fb_data.get('model_version', 'v1.0.0')}</code>)</div>
                <div class=\"fb-card-grid\">
                    <div><span>Total:</span> <strong>{fb_data.get('total', 0)}</strong></div>
                    <div><span>Correct:</span> <strong class=\"text-success\">{fb_data.get('correct', 0)}</strong></div>
                    <div><span>Incorrect:</span> <strong class=\"text-danger\">{fb_data.get('incorrect', 0)}</strong></div>
                    <div><span>User Accuracy:</span> <strong class=\"text-accent\">{acc_rate}</strong></div>
                </div>
            </div>
            """
        if not fb_by_model_html:
            fb_by_model_html = "<span class='text-subtle'>No feedback submissions recorded yet.</span>"

        return f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>ScamShield AI — MLOps Monitoring Dashboard</title>
    <style>
        :root {{
            --bg-primary: #0f172a;
            --bg-card: #1e293b;
            --bg-hover: #334155;
            --border-color: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent: #38bdf8;
            --accent-glow: rgba(56, 189, 248, 0.15);
            --success: #22c55e;
            --warning: #eab308;
            --danger: #ef4444;
            --purple: #a855f7;
            --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ background-color: var(--bg-primary); color: var(--text-primary); font-family: var(--font-sans); padding: 28px 36px; line-height: 1.5; }}
        header {{ display: flex; justify-content: space-between; align-items: center; padding-bottom: 24px; border-bottom: 1px solid var(--border-color); margin-bottom: 28px; }}
        .logo-group {{ display: flex; align-items: center; gap: 14px; }}
        .shield-icon {{ font-size: 32px; background: linear-gradient(135deg, #38bdf8, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
        h1 {{ font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }}
        .subtitle {{ color: var(--text-secondary); font-size: 13px; }}
        .header-meta {{ display: flex; gap: 12px; align-items: center; }}
        .live-tag {{ background-color: rgba(34, 197, 94, 0.15); color: var(--success); padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(34, 197, 94, 0.3); }}
        .live-dot {{ width: 7px; height: 7px; border-radius: 50%; background-color: var(--success); box-shadow: 0 0 8px var(--success); }}
        .kpi-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 18px; margin-bottom: 32px; }}
        .kpi-card {{ background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 18px 22px; display: flex; flex-direction: column; gap: 8px; transition: transform 0.15s ease, border-color 0.15s ease; }}
        .kpi-card:hover {{ transform: translateY(-2px); border-color: var(--accent); }}
        .kpi-title {{ font-size: 13px; font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }}
        .kpi-value {{ font-size: 32px; font-weight: 700; letter-spacing: -0.5px; color: var(--text-primary); }}
        .kpi-subtext {{ font-size: 12px; color: var(--text-secondary); }}
        .section-title {{ font-size: 18px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }}
        .section-container {{ background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 22px; margin-bottom: 28px; }}
        table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
        th {{ text-align: left; padding: 12px 14px; color: var(--text-secondary); font-weight: 600; border-bottom: 1px solid var(--border-color); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }}
        td {{ padding: 13px 14px; border-bottom: 1px solid var(--border-color); }}
        tr:last-child td {{ border-bottom: none; }}
        tr:hover td {{ background: rgba(255, 255, 255, 0.02); }}
        .num {{ text-align: right; font-family: var(--font-mono); }}
        th.num {{ text-align: right; }}
        .date {{ color: var(--text-secondary); font-size: 12px; font-family: var(--font-mono); }}
        code {{ font-family: var(--font-mono); background: rgba(255, 255, 255, 0.06); padding: 3px 6px; border-radius: 4px; font-size: 12px; }}
        .badge {{ display: inline-block; padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }}
        .badge-prod {{ background: rgba(34, 197, 94, 0.15); color: var(--success); border: 1px solid rgba(34, 197, 94, 0.3); }}
        .badge-test {{ background: rgba(56, 189, 248, 0.15); color: var(--accent); border: 1px solid rgba(56, 189, 248, 0.3); }}
        .badge-dev {{ background: rgba(168, 85, 247, 0.15); color: var(--purple); border: 1px solid rgba(168, 85, 247, 0.3); }}
        .badge-rejected {{ background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); }}
        .badge-archived {{ background: rgba(148, 163, 184, 0.12); color: var(--text-secondary); border: 1px solid rgba(148, 163, 184, 0.25); }}
        .badge-latest {{ background: rgba(56, 189, 248, 0.12); color: var(--accent); font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; }}
        .format-tag {{ background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; }}
        .two-col {{ display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }}
        @media (max-width: 900px) {{ .two-col {{ grid-template-columns: 1fr; }} }}
        .pill-group {{ display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; }}
        .stat-pill {{ background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-color); padding: 8px 14px; border-radius: 8px; display: flex; align-items: center; gap: 10px; }}
        .pill-label {{ font-size: 12px; color: var(--text-secondary); }}
        .pill-val {{ font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }}
        .model-fb-card {{ background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 12px; }}
        .fb-card-title {{ font-size: 13px; font-weight: 600; margin-bottom: 8px; }}
        .fb-card-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 12px; }}
        .fb-card-grid span {{ color: var(--text-secondary); }}
        .text-accent {{ color: var(--accent); }}
        .text-success {{ color: var(--success); }}
        .text-danger {{ color: var(--danger); }}
        .text-subtle {{ color: var(--text-secondary); font-size: 12px; }}
        .font-bold {{ font-weight: 700; }}
        footer {{ margin-top: 36px; padding-top: 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 12px; }}
    </style>
</head>
<body>
    <header>
        <div class=\"logo-group\">
            <div class=\"shield-icon\">🛡️</div>
            <div>
                <h1>ScamShield AI — MLOps Monitoring Dashboard</h1>
                <div class=\"subtitle\">Real-time model registry, dataset versioning, performance scorecards & telemetry</div>
            </div>
        </div>
        <div class=\"header-meta\">
            <span class=\"live-tag\"><span class=\"live-dot\"></span> System Online</span>
            <code>FastAPI Serving :8000</code>
        </div>
    </header>

    <div class=\"kpi-grid\">
        <div class=\"kpi-card\">
            <div class=\"kpi-title\">Active Production Models</div>
            <div class=\"kpi-value text-success\">{summary['production_models_count']}</div>
            <div class=\"kpi-subtext\">Across {summary['total_models_tracked']} registered versions</div>
        </div>
        <div class=\"kpi-card\">
            <div class=\"kpi-title\">Dataset Versions</div>
            <div class=\"kpi-value text-accent\">{summary['dataset_versions_count']}</div>
            <div class=\"kpi-subtext\">Version snapshots tracked</div>
        </div>
        <div class=\"kpi-card\">
            <div class=\"kpi-title\">Predictions Monitored</div>
            <div class=\"kpi-value\">{summary['total_predictions_logged']}</div>
            <div class=\"kpi-subtext\">Anonymized inference telemetry</div>
        </div>
        <div class=\"kpi-card\">
            <div class=\"kpi-title\">User Feedback Submissions</div>
            <div class=\"kpi-value text-accent\">{summary['total_feedback_submissions']}</div>
            <div class=\"kpi-subtext\">{summary['user_accuracy_rate'] * 100:.1f}% User Accuracy Rate</div>
        </div>
        <div class=\"kpi-card\">
            <div class=\"kpi-title\">Retraining Candidates</div>
            <div class=\"kpi-value text-purple\">{summary['retraining_candidates_ready']}</div>
            <div class=\"kpi-subtext\">Approved labeled samples ready</div>
        </div>
    </div>

    <div class=\"section-container\">
        <div class=\"section-title\">
            <span>🧠 Model Registry & Evaluation Scorecards</span>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Model Name</th>
                    <th>Version</th>
                    <th>Status / Stage</th>
                    <th>Dataset Ver.</th>
                    <th class=\"num\">Accuracy</th>
                    <th class=\"num\">Precision</th>
                    <th class=\"num\">Recall</th>
                    <th class=\"num\">F1-Score</th>
                    <th>Training Date (UTC)</th>
                </tr>
            </thead>
            <tbody>
                {model_rows_html}
            </tbody>
        </table>
    </div>

    <div class=\"section-container\">
        <div class=\"section-title\">
            <span>📦 Dataset Versioning Catalog</span>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Dataset Name</th>
                    <th>Version</th>
                    <th class=\"num\">Records</th>
                    <th>Format</th>
                    <th>SHA-256 Checksum</th>
                    <th>Description</th>
                    <th>Snapshot Created</th>
                </tr>
            </thead>
            <tbody>
                {dataset_rows_html}
            </tbody>
        </table>
    </div>

    <div class=\"two-col\">
        <div class=\"section-container\">
            <div class=\"section-title\">
                <span>📈 Real-Time Prediction Telemetry</span>
            </div>
            <p class=\"text-subtle\" style=\"margin-bottom: 14px;\">
                Privacy-Preserving Telemetry (SHA-256 text hashes, zero PII persisted)
            </p>
            <div style=\"margin-bottom: 16px;\">
                <div class=\"text-subtle\">Average Risk Score: <strong>{telemetry.get('avg_risk_score', 0)}/100</strong></div>
                <div class=\"text-subtle\">Average Confidence: <strong>{telemetry.get('avg_confidence', 0):.2f}</strong></div>
                <div class=\"text-subtle\">Average Latency: <strong>{telemetry.get('avg_execution_time_ms', 0):.2f} ms</strong></div>
            </div>
            <div class=\"text-subtle font-bold\" style=\"margin-bottom: 6px;\">Risk Status Distribution:</div>
            <div class=\"pill-group\">
                {status_dist_html}
            </div>
        </div>

        <div class=\"section-container\">
            <div class=\"section-title\">
                <span>💬 User Feedback Loop & Retraining Signals</span>
            </div>
            <p class=\"text-subtle\" style=\"margin-bottom: 14px;\">
                Feedback submitted via Mobile / Backend API (Correct vs. Incorrect)
            </p>
            <div>
                {fb_by_model_html}
            </div>
        </div>
    </div>

    <footer>
        <div>ScamShield AI MLOps Pipeline — Demonstration & Monitoring Interface</div>
        <div>React Native UI: Completely Independent & Untouched</div>
    </footer>
</body>
</html>
"""


# Global singleton
dashboard_service = DashboardService()
