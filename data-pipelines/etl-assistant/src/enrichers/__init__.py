"""
ETL Assistant Enrichers

Pluggable enrichers for streaming ETL pipelines:
- GeoIP: IP address to geographical location
- Language detection: Detect language of text content
- Hashing: Content hashing and perceptual hashing
- EXIF scrubbing: Remove metadata from images
- OCR/STT: Optical character recognition and speech-to-text hooks
"""

from .base import BaseEnricher, EnricherResult, EnrichmentContext
from .exif_scrub import ExifScrubEnricher
from .geoip import GeoIPEnricher
from .hashing import HashingEnricher
from .language import LanguageEnricher
from .ocr_stt import OCREnricher, STTEnricher

__all__ = [
    "BaseEnricher",
    "EnricherResult",
    "EnrichmentContext",
    "ExifScrubEnricher",
    "GeoIPEnricher",
    "HashingEnricher",
    "LanguageEnricher",
    "OCREnricher",
    "STTEnricher",
]
