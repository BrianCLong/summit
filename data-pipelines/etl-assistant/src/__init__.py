"""ETL Assistant - Interactive mapping and compliance engine."""

from .license_client import LicenseCheckResult, LicenseClient
from .lineage_recorder import (
    IngestConfiguration,
    LicenseDecision,
    LineageRecorder,
    MappingDecision,
    PIIHandling,
)
from .pii_detector import (
    PIICategory,
    PIIDetector,
    PIIMatch,
    PIIScanResult,
    PIISeverity,
    RedactionStrategy,
)
from .schema_inference import (
    CanonicalEntity,
    FieldSchema,
    FieldType,
    InferredSchema,
    MappingSuggestion,
    SchemaInferenceEngine,
)

__all__ = [
    # Schema inference
    "SchemaInferenceEngine",
    "InferredSchema",
    "FieldSchema",
    "MappingSuggestion",
    "CanonicalEntity",
    "FieldType",
    # PII detection
    "PIIDetector",
    "PIIScanResult",
    "PIIMatch",
    "PIICategory",
    "PIISeverity",
    "RedactionStrategy",
    # Lineage
    "LineageRecorder",
    "IngestConfiguration",
    "MappingDecision",
    "PIIHandling",
    "LicenseDecision",
    # License client
    "LicenseClient",
    "LicenseCheckResult",
]
