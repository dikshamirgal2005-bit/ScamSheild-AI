"""
schemas.py
----------
Pydantic schemas for request validation, feedback submissions, and structured responses.
Matches React Native mobile application data models.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field("healthy", description="Service health state")
    version: str = Field("1.0.0", description="API version")
    models_loaded: Dict[str, bool] = Field(..., description="Availability status of each model pipeline")
    active_models: Optional[Dict[str, Any]] = Field(None, description="Active Production model versions currently served by backend")


class MessageScanRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Raw SMS/chat message text")
    sender: Optional[str] = Field(None, description="Optional sender header or phone number")


class MessageScanResponse(BaseModel):
    riskScore: int = Field(..., ge=0, le=100, description="Risk score from 0 to 100")
    status: str = Field(..., description="'safe' | 'warning' | 'danger'")
    statusLabel: str = Field(..., description="Human-readable status label")
    verdict: str = Field(..., description="Summary verdict sentence")
    reason: str = Field(..., description="Explanation of the verdict")
    indicators: List[str] = Field(default_factory=list, description="List of detected threat indicators")
    recommendations: List[str] = Field(default_factory=list, description="Suggested actions for user safety")
    scamType: str = Field("None", description="Primary detected scam category")
    probability: float = Field(..., ge=0.0, le=1.0, description="Model confidence probability")
    modelVersion: Optional[str] = Field(None, description="Active Production model version used for inference")


class ScamTypeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Message text to categorize")


class ScamTypeResponse(BaseModel):
    topScamType: str = Field(..., description="Identified scam category key")
    displayName: str = Field(..., description="Formatted display title")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score for top class")
    distribution: Dict[str, float] = Field(..., description="Probability breakdown across 9 categories")
    supportedCategories: List[str] = Field(..., description="All detectable categories")
    modelVersion: Optional[str] = Field(None, description="Active Production model version used for inference")


class URLScanRequest(BaseModel):
    url: str = Field(..., min_length=3, max_length=2048, description="URL string to analyze")


class URLScanResponse(BaseModel):
    url: str = Field(..., description="Evaluated URL")
    riskScore: int = Field(..., ge=0, le=100, description="Threat score (0-100)")
    status: str = Field(..., description="'safe' | 'suspicious' | 'malicious'")
    statusLabel: str = Field(..., description="Display label")
    verdict: str = Field(..., description="Verdict message")
    flags: List[str] = Field(default_factory=list, description="Detected structural anomalies")
    features: Dict[str, Any] = Field(default_factory=dict, description="Extracted lexical metrics")
    liveCheck: Dict[str, Any] = Field(default_factory=dict, description="Real-time public DNS/HTTP intelligence")
    modelVersion: Optional[str] = Field(None, description="Active Production model version used for inference")


class ModelReloadResponse(BaseModel):
    status: str = Field("success", description="Reload operation status")
    reloaded_models: Dict[str, str] = Field(..., description="Mapping of model names to newly loaded production versions")


class UserFeedbackRequest(BaseModel):
    prediction_id: Optional[str] = Field(None, description="ID of prediction being evaluated")
    model_name: str = Field(..., description="Name of model evaluated ('message_model', 'scam_type_model', 'url_model')")
    model_version: str = Field(..., description="Model version used for prediction")
    user_feedback: str = Field(..., description="'correct' | 'incorrect'")
    input_type: str = Field(..., description="'message' | 'scam_type' | 'url'")
    predicted_label: str = Field(..., description="Model's predicted status/label")
    corrected_label: Optional[str] = Field(None, description="User provided true label if incorrect")
    text_or_url: Optional[str] = Field(None, description="Raw input snippet/URL for future retraining preparation")
    user_comments: Optional[str] = Field(None, description="Optional note or explanation")


class UserFeedbackResponse(BaseModel):
    feedback_id: str = Field(..., description="Unique feedback record identifier")
    status: str = Field(..., description="Processing status ('approved' or 'pending_review')")
    target_label: str = Field(..., description="Assigned true label for retraining dataset")
    message: str = Field("Feedback submitted successfully.", description="Status summary message")


class ExportRetrainingDataRequest(BaseModel):
    model_name: str = Field(..., description="Model name to export labeled retraining data for")


class ExportRetrainingDataResponse(BaseModel):
    model_name: str = Field(..., description="Target model name")
    exported_samples: int = Field(..., description="Number of labeled retraining samples prepared")
    output_path: str = Field(..., description="File path of exported candidate JSON dataset")
