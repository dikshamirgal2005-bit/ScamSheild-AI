"""
Text Normalization & Anti-Obfuscation Cleaning Utility.
"""
import re
import html
import unicodedata
from typing import List, Optional

URL_PATTERN = r"https?://\S+|www\.\S+"
PHONE_PATTERN = r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"


def extract_urls(text: str) -> List[str]:
    """Extract all URLs from a text string."""
    if not isinstance(text, str):
        return []
    return re.findall(URL_PATTERN, text)


def extract_phone_numbers(text: str) -> List[str]:
    """Extract all phone numbers from a text string."""
    if not isinstance(text, str):
        return []
    return re.findall(PHONE_PATTERN, text)


def clean_text(
    text: str,
    lowercase: bool = True,
    normalize_urls: bool = True,
    normalize_phones: bool = True,
    normalize_phone_numbers: Optional[bool] = None,
    remove_extra_spaces: bool = True,
    handle_html: bool = True,
) -> str:
    """Cleans and standardizes raw text inputs from SMS, WhatsApp, and Emails."""
    if not isinstance(text, str):
        return ""

    if normalize_phone_numbers is not None:
        normalize_phones = normalize_phone_numbers

    if handle_html:
        text = html.unescape(text)

    text = unicodedata.normalize("NFKC", text)

    if lowercase:
        text = text.lower()

    if normalize_urls:
        text = re.sub(URL_PATTERN, " [URL] ", text)

    if normalize_phones:
        text = re.sub(PHONE_PATTERN, " [PHONE] ", text)

    text = re.sub(r"[\u200B-\u200D\uFEFF]", "", text)

    if remove_extra_spaces:
        text = re.sub(r"\s+", " ", text).strip()

    return text
