"""
Standardized performance metrics calculation for binary and multi-class security models.
"""
from typing import Any, Dict, List, Optional, Union


def calculate_binary_metrics(
    y_true: List[int],
    y_pred: List[int],
    y_prob: Optional[List[float]] = None,
) -> Dict[str, float]:
    """Computes Accuracy, Precision, Recall, F1, and optional ROC-AUC for binary models."""
    try:
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
        metrics = {
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
            "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
            "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
        }
        if y_prob is not None:
            try:
                metrics["roc_auc"] = round(float(roc_auc_score(y_true, y_prob)), 4)
            except Exception:
                metrics["roc_auc"] = 0.0
        return metrics
    except ImportError:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
        tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
        total = len(y_true) or 1
        acc = (tp + tn) / total
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
        return {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
        }


def calculate_multiclass_metrics(
    y_true: List[int],
    y_pred: List[int],
    target_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Computes Macro/Weighted F1, Precision, Recall, and per-class report."""
    try:
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
        metrics: Dict[str, Any] = {
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
            "macro_precision": round(float(precision_score(y_true, y_pred, average="macro", zero_division=0)), 4),
            "macro_recall": round(float(recall_score(y_true, y_pred, average="macro", zero_division=0)), 4),
            "macro_f1": round(float(f1_score(y_true, y_pred, average="macro", zero_division=0)), 4),
            "weighted_f1": round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
        }
        if target_names:
            class_labels = list(range(len(target_names)))
            report = classification_report(
                y_true, y_pred, labels=class_labels, target_names=target_names, output_dict=True, zero_division=0
            )
            metrics["per_class_report"] = report
        return metrics
    except ImportError:
        correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
        acc = correct / len(y_true) if len(y_true) > 0 else 0.0
        return {
            "accuracy": round(acc, 4),
            "macro_precision": round(acc, 4),
            "macro_recall": round(acc, 4),
            "macro_f1": round(acc, 4),
            "weighted_f1": round(acc, 4),
        }


def calculate_confusion_matrix(
    y_true: List[Any],
    y_pred: List[Any],
    labels: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    """Computes confusion matrix and class labels list."""
    if labels is None:
        labels = sorted(list(set(y_true) | set(y_pred)), key=lambda x: str(x))

    label_to_idx = {l: i for i, l in enumerate(labels)}
    n = len(labels)
    matrix = [[0 for _ in range(n)] for _ in range(n)]

    for t, p in zip(y_true, y_pred):
        if t in label_to_idx and p in label_to_idx:
            matrix[label_to_idx[t]][label_to_idx[p]] += 1

    cm_data: Dict[str, Any] = {
        "labels": [str(l) for l in labels],
        "matrix": matrix,
    }

    if n == 2:
        cm_data["tn"] = matrix[0][0]
        cm_data["fp"] = matrix[0][1]
        cm_data["fn"] = matrix[1][0]
        cm_data["tp"] = matrix[1][1]
        cm_data["false_positive_rate"] = round(matrix[0][1] / (matrix[0][0] + matrix[0][1]), 4) if (matrix[0][0] + matrix[0][1]) > 0 else 0.0
        cm_data["false_negative_rate"] = round(matrix[1][0] / (matrix[1][0] + matrix[1][1]), 4) if (matrix[1][0] + matrix[1][1]) > 0 else 0.0

    return cm_data


def roc_auc_score_safe(y_true: List[int], y_prob: Optional[List[float]]) -> Optional[float]:
    if not y_prob or len(set(y_true)) < 2:
        return None
    try:
        from sklearn.metrics import roc_auc_score
        return round(float(roc_auc_score(y_true, y_prob)), 4)
    except Exception:
        return None


binary_metrics = calculate_binary_metrics
multiclass_metrics = calculate_multiclass_metrics
confusion_matrix_data = calculate_confusion_matrix
