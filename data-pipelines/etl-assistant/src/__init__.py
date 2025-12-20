"""ETL Assistant - Interactive mapping and compliance engine."""

from .schema_inference import (
    SchemaInferenceEngine,
    InferredSchema,
    FieldSchema,
    MappingSuggestion,
    CanonicalEntity,
    FieldType,
)
from .pii_detector import (
    PIIDetector,
    PIIScanResult,
    PIIMatch,
    PIICategory,
    PIISeverity,
    RedactionStrategy,
)
from .lineage_recorder import (
    LineageRecorder,
    IngestConfiguration,
    MappingDecision,
    PIIHandling,
    LicenseDecision,
)
from .license_client import LicenseClient, LicenseCheckResult

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
