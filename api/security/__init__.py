"""
Security utilities for the summit API.

This package provides security-related utilities including:
- Secure tar extraction with vulnerability protections
- Input validation helpers
- Path safety checks
"""

from .tar_extraction import SecureTarExtractor, extract_tar_safe

__all__ = ["SecureTarExtractor", "extract_tar_safe"]
