"""
Data Governance for IntelGraph Pipelines
Contracts, schema evolution, compliance, privacy, and data quality governance
"""

from .classification import DataClassifier, PIIDetector
from .contracts import ContractManager, ContractValidationError, SchemaEvolutionManager
from .lineage import LineageTracker, OpenLineageEmitter
from .privacy import (
    ConsentManager,
    ConsentRecord,
    ConsentStatus,
    DataMasker,
    MaskingStrategy,
    PIIDetectionRule,
    PIIType,
    PrivacyGovernor,
    ProcessingPurpose,
)

__all__ = [
    "ContractManager",
    "ContractValidationError",
    "SchemaEvolutionManager",
    "DataClassifier",
    "PIIDetector",
    "LineageTracker",
    "OpenLineageEmitter",
    "PrivacyGovernor",
    "DataMasker",
    "ConsentManager",
    "PIIType",
    "MaskingStrategy",
    "ConsentStatus",
    "ProcessingPurpose",
    "PIIDetectionRule",
    "ConsentRecord",
]
