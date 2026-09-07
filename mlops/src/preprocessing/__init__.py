"""
preprocessing package
---------------------
Reusable data cleaning, feature extraction, and partitioning pipelines for ScamShield AI.
"""
from .base_pipeline import BaseDataPipeline
from .text_cleaner import clean_text, extract_urls, extract_phone_numbers
from .message_pipeline import MessagePipeline, MessagePreprocessor
from .scam_type_pipeline import ScamTypePipeline, ScamTypePreprocessor
from .url_features import URLExtractor
from .url_pipeline import URLPipeline

__all__ = [
    "BaseDataPipeline",
    "clean_text",
    "extract_urls",
    "extract_phone_numbers",
    "MessagePipeline",
    "MessagePreprocessor",
    "ScamTypePipeline",
    "ScamTypePreprocessor",
    "URLExtractor",
    "URLPipeline",
]
