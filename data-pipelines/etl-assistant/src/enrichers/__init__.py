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
from .geoip import GeoIPEnricher
from .language import LanguageEnricher
from .hashing import HashingEnricher
from .exif_scrub import ExifScrubEnricher
from .ocr_stt import OCREnricher, STTEnricher

__all__ = [
    'BaseEnricher',
    'EnricherResult',
    'EnrichmentContext',
    'GeoIPEnricher',
    'LanguageEnricher',
    'HashingEnricher',
    'ExifScrubEnricher',
    'OCREnricher',
    'STTEnricher',
]
