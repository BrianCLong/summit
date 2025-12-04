"""Language detection enricher."""

import re
from typing import Any, Dict, Optional

from .base import BaseEnricher, EnricherResult, EnrichmentContext


class LanguageEnricher(BaseEnricher):
    """
    Detects language of text content.

    Adds:
    - language code (ISO 639-1)
    - confidence score
    - script detection (Latin, Cyrillic, etc.)

    This is a stub implementation with basic heuristics.
    In production, integrate with langdetect, fasttext, or similar library.
    """

    # Simple language detection patterns (very basic heuristics)
    LANGUAGE_PATTERNS = {
        'es': re.compile(r'\b(el|la|los|las|un|una|de|que|en|por)\b', re.IGNORECASE),
        'fr': re.compile(r'\b(le|la|les|un|une|de|que|dans|pour|avec)\b', re.IGNORECASE),
        'de': re.compile(r'\b(der|die|das|ein|eine|und|in|zu|von)\b', re.IGNORECASE),
        'it': re.compile(r'\b(il|la|i|le|un|una|di|che|in|per)\b', re.IGNORECASE),
        'pt': re.compile(r'\b(o|a|os|as|um|uma|de|que|em|por)\b', re.IGNORECASE),
        'ru': re.compile(r'[а-яА-Я]{3,}'),  # Cyrillic characters
        'zh': re.compile(r'[\u4e00-\u9fff]{2,}'),  # Chinese characters
        'ja': re.compile(r'[\u3040-\u309f\u30a0-\u30ff]{2,}'),  # Japanese hiragana/katakana
        'ar': re.compile(r'[\u0600-\u06ff]{3,}'),  # Arabic
        'ko': re.compile(r'[\uac00-\ud7af]{2,}'),  # Korean
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.enabled = self.config.get('enabled', True)
        self.min_text_length = self.config.get('min_text_length', 10)
        self.confidence_threshold = self.config.get('confidence_threshold', 0.5)

    def can_enrich(self, data: Dict[str, Any]) -> bool:
        """Check if data contains text content."""
        if not self.enabled:
            return False

        # Check for text fields
        text_fields = ['text', 'content', 'body', 'message', 'description', 'title', 'name']

        for field in text_fields:
            if field in data and isinstance(data[field], str):
                if len(data[field]) >= self.min_text_length:
                    return True

        return False

    def enrich(self, data: Dict[str, Any], context: EnrichmentContext) -> EnricherResult:
        """Detect language of text content."""
        result = EnricherResult(success=True)

        # Find text fields
        text_data = self._extract_text_fields(data)

        if not text_data:
            result.add_warning("No text content found for language detection")
            return result

        # Detect language for each text field
        language_data = {}
        for field_name, text in text_data.items():
            try:
                lang_info = self._detect_language(text)
                language_data[f"{field_name}_language"] = lang_info

                # Add provenance metadata
                result.metadata[f"{field_name}_lang_detected"] = True
                result.metadata[f"{field_name}_lang_code"] = lang_info['language']

            except Exception as e:
                result.add_warning(f"Failed to detect language for {field_name}: {str(e)}")

        # Add language data to result
        result.add_enrichment('language', language_data)

        return result

    def _extract_text_fields(self, data: Dict[str, Any]) -> Dict[str, str]:
        """Extract text fields from data."""
        text_data = {}

        # Common text field names
        text_fields = ['text', 'content', 'body', 'message', 'description', 'title', 'name']

        for field in text_fields:
            if field in data and isinstance(data[field], str):
                text = data[field].strip()
                if len(text) >= self.min_text_length:
                    text_data[field] = text

        return text_data

    def _detect_language(self, text: str) -> Dict[str, Any]:
        """
        Detect language of text.

        STUB IMPLEMENTATION: Uses simple pattern matching.
        In production, use langdetect, fasttext, or similar library.
        """
        # Count matches for each language
        language_scores = {}

        for lang_code, pattern in self.LANGUAGE_PATTERNS.items():
            matches = pattern.findall(text)
            if matches:
                language_scores[lang_code] = len(matches)

        # Default to English if no matches
        if not language_scores:
            return {
                'language': 'en',
                'confidence': 0.6,
                'script': 'Latin',
                'is_stub': True,
                'enricher': 'language-stub-v1',
            }

        # Get language with highest score
        detected_lang = max(language_scores, key=language_scores.get)
        total_matches = sum(language_scores.values())
        confidence = language_scores[detected_lang] / total_matches

        # Determine script
        script = self._detect_script(text)

        return {
            'language': detected_lang,
            'confidence': confidence,
            'script': script,
            'alternative_languages': [
                {'language': lang, 'score': score / total_matches}
                for lang, score in sorted(
                    language_scores.items(), key=lambda x: x[1], reverse=True
                )[1:3]
            ],
            'is_stub': True,
            'enricher': 'language-stub-v1',
        }

    def _detect_script(self, text: str) -> str:
        """Detect writing script."""
        if re.search(r'[\u4e00-\u9fff]', text):
            return 'Han'
        elif re.search(r'[\u0600-\u06ff]', text):
            return 'Arabic'
        elif re.search(r'[а-яА-Я]', text):
            return 'Cyrillic'
        elif re.search(r'[\u3040-\u309f\u30a0-\u30ff]', text):
            return 'Japanese'
        elif re.search(r'[\uac00-\ud7af]', text):
            return 'Hangul'
        else:
            return 'Latin'
