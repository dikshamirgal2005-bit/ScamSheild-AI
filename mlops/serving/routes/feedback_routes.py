"""
feedback_routes.py
-------------------
API endpoints for user prediction feedback collection and retraining dataset preparation.
"""
from fastapi import APIRouter
from serving.schemas import (
    ExportRetrainingDataRequest,
    ExportRetrainingDataResponse,
    UserFeedbackRequest,
    UserFeedbackResponse,
)
from src.common.feedback import feedback_manager

router = APIRouter(prefix="/api/v1/feedback", tags=["Feedback Loop"])


@router.post("", response_model=UserFeedbackResponse)
def submit_feedback(req: UserFeedbackRequest) -> UserFeedbackResponse:
    """
    Submits user feedback (Correct or Incorrect) for a prediction.
    Stores feedback alongside prediction ID and model version for retraining dataset preparation.
    Does NOT automatically retrain models on submission.
    """
    entry = feedback_manager.submit_feedback(
        model_name=req.model_name,
        model_version=req.model_version,
        prediction_id=req.prediction_id or "anonymous",
        user_feedback=req.user_feedback,
        input_type=req.input_type,
        predicted_label=req.predicted_label,
        corrected_label=req.corrected_label,
        text_or_url=req.text_or_url,
        user_comments=req.user_comments,
    )

    return UserFeedbackResponse(
        feedback_id=entry["feedback_id"],
        status=entry["status"],
        target_label=entry["target_label"],
        message="User feedback recorded. Data prepared for future model retraining cycles.",
    )


@router.get("/summary")
def get_feedback_summary() -> dict:
    """Returns overall accuracy rate and model version feedback statistics."""
    return feedback_manager.get_feedback_summary()


@router.post("/export", response_model=ExportRetrainingDataResponse)
def export_retraining_data(req: ExportRetrainingDataRequest) -> ExportRetrainingDataResponse:
    """Exports prepared user feedback samples as labeled dataset ready for model retraining."""
    result = feedback_manager.export_retraining_dataset(model_name=req.model_name)
    return ExportRetrainingDataResponse(
        model_name=result["model_name"],
        exported_samples=result["exported_samples"],
        output_path=result["output_path"],
    )
