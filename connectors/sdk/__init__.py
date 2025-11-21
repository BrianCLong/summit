"""
IntelGraph Connector SDK

Provides base classes and utilities for building compliant data connectors.
"""

from .base import BaseConnector
from .license import LicenseEnforcer, LicenseViolationError
from .pii import PIIDetector, PIIField, PIISeverity, RedactionPolicy
from .rate_limiter import RateLimiter, RateLimitExceeded
from .validator import ManifestValidator, validate_manifest

__all__ = [
    "BaseConnector",
    "LicenseEnforcer",
    "LicenseViolationError",
    "PIIDetector",
    "PIIField",
    "PIISeverity",
    "RedactionPolicy",
    "RateLimiter",
    "RateLimitExceeded",
    "ManifestValidator",
    "validate_manifest",
]
