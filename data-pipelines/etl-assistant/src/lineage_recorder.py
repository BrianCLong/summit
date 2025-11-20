"""Lineage recording for ETL configurations and ingest decisions.

Records mapping decisions, transformations, and data provenance for
compliance and auditability.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any


@dataclass
class MappingDecision:
    """A single field mapping decision."""
    source_field: str
    canonical_entity: str
    canonical_property: str
    transformation: str | None = None  # Optional transformation applied
    confidence: float = 1.0
    approved_by: str | None = None
    approved_at: str | None = None


@dataclass
class PIIHandling:
    """PII handling decision for a field."""
    field_name: str
    pii_category: str
    redaction_strategy: str
    reason: str
    approved_by: str | None = None


@dataclass
class LicenseDecision:
    """License compliance decision."""
    source_name: str
    license_id: str | None
    compliance_status: str  # allow, warn, block
    reason: str
    override_by: str | None = None
    override_reason: str | None = None


@dataclass
class IngestConfiguration:
    """Complete ingest configuration with lineage."""
    config_id: str
    tenant_id: str
    source_name: str
    source_type: str  # csv, json, api, etc.
    source_hash: str  # Hash of source data sample
    created_at: str
    created_by: str

    # Schema and mapping
    schema_fingerprint: str
    field_mappings: list[MappingDecision] = field(default_factory=list)

    # PII handling
    pii_handling: list[PIIHandling] = field(default_factory=list)

    # License compliance
    license_decision: LicenseDecision | None = None

    # Provenance chain
    provenance_chain: list[str] = field(default_factory=list)

    # Metadata
    metadata: dict[str, Any] = field(default_factory=dict)


class LineageRecorder:
    """Records and manages ETL configuration lineage."""

    def __init__(self, storage_path: Path | None = None):
        """Initialize lineage recorder.

        Args:
            storage_path: Directory to store lineage records (defaults to ./lineage)
        """
        self.storage_path = storage_path or Path("./lineage")
        self.storage_path.mkdir(parents=True, exist_ok=True)

    def create_configuration(
        self,
        tenant_id: str,
        source_name: str,
        source_type: str,
        sample_data: list[dict[str, Any]],
        created_by: str,
    ) -> IngestConfiguration:
        """Create a new ingest configuration.

        Args:
            tenant_id: Tenant identifier
            source_name: Name of data source
            source_type: Type of source (csv, json, etc.)
            sample_data: Sample rows for fingerprinting
            created_by: User/system creating the configuration

        Returns:
            New IngestConfiguration instance
        """
        config_id = str(uuid.uuid4())
        source_hash = self._hash_sample(sample_data)
        schema_fingerprint = self._fingerprint_schema(sample_data)

        config = IngestConfiguration(
            config_id=config_id,
            tenant_id=tenant_id,
            source_name=source_name,
            source_type=source_type,
            source_hash=source_hash,
            schema_fingerprint=schema_fingerprint,
            created_at=datetime.utcnow().isoformat(),
            created_by=created_by,
            provenance_chain=[config_id],
        )

        return config

    def add_mapping_decision(
        self,
        config: IngestConfiguration,
        source_field: str,
        canonical_entity: str,
        canonical_property: str,
        transformation: str | None = None,
        confidence: float = 1.0,
        approved_by: str | None = None,
    ) -> None:
        """Add a field mapping decision to configuration.

        Args:
            config: Configuration to update
            source_field: Source field name
            canonical_entity: Target canonical entity type
            canonical_property: Target property name
            transformation: Optional transformation expression
            confidence: Confidence score (0-1)
            approved_by: User approving the mapping
        """
        decision = MappingDecision(
            source_field=source_field,
            canonical_entity=canonical_entity,
            canonical_property=canonical_property,
            transformation=transformation,
            confidence=confidence,
            approved_by=approved_by,
            approved_at=datetime.utcnow().isoformat() if approved_by else None,
        )

        config.field_mappings.append(decision)

    def add_pii_handling(
        self,
        config: IngestConfiguration,
        field_name: str,
        pii_category: str,
        redaction_strategy: str,
        reason: str,
        approved_by: str | None = None,
    ) -> None:
        """Add PII handling decision to configuration.

        Args:
            config: Configuration to update
            field_name: Field containing PII
            pii_category: Type of PII detected
            redaction_strategy: Strategy to apply
            reason: Explanation for the decision
            approved_by: User approving the decision
        """
        handling = PIIHandling(
            field_name=field_name,
            pii_category=pii_category,
            redaction_strategy=redaction_strategy,
            reason=reason,
            approved_by=approved_by,
        )

        config.pii_handling.append(handling)

    def set_license_decision(
        self,
        config: IngestConfiguration,
        source_name: str,
        license_id: str | None,
        compliance_status: str,
        reason: str,
        override_by: str | None = None,
        override_reason: str | None = None,
    ) -> None:
        """Set license compliance decision.

        Args:
            config: Configuration to update
            source_name: Name of the source
            license_id: License identifier (if registered)
            compliance_status: allow, warn, or block
            reason: Human-readable reason
            override_by: User overriding a block (if applicable)
            override_reason: Reason for override
        """
        config.license_decision = LicenseDecision(
            source_name=source_name,
            license_id=license_id,
            compliance_status=compliance_status,
            reason=reason,
            override_by=override_by,
            override_reason=override_reason,
        )

    def save_configuration(self, config: IngestConfiguration) -> Path:
        """Persist configuration to disk.

        Args:
            config: Configuration to save

        Returns:
            Path where configuration was saved
        """
        # Create tenant directory
        tenant_dir = self.storage_path / config.tenant_id
        tenant_dir.mkdir(parents=True, exist_ok=True)

        # Save with config ID as filename
        file_path = tenant_dir / f"{config.config_id}.json"

        with open(file_path, "w") as f:
            json.dump(asdict(config), f, indent=2)

        return file_path

    def load_configuration(self, config_id: str, tenant_id: str) -> IngestConfiguration:
        """Load configuration from disk.

        Args:
            config_id: Configuration ID
            tenant_id: Tenant ID

        Returns:
            Loaded IngestConfiguration

        Raises:
            FileNotFoundError: If configuration doesn't exist
        """
        file_path = self.storage_path / tenant_id / f"{config_id}.json"

        with open(file_path) as f:
            data = json.load(f)

        # Reconstruct dataclass (simple version, assumes flat structure)
        return IngestConfiguration(**data)

    def list_configurations(self, tenant_id: str) -> list[str]:
        """List all configuration IDs for a tenant.

        Args:
            tenant_id: Tenant ID

        Returns:
            List of configuration IDs
        """
        tenant_dir = self.storage_path / tenant_id

        if not tenant_dir.exists():
            return []

        return [
            file.stem for file in tenant_dir.glob("*.json")
        ]

    def query_by_source(
        self, tenant_id: str, source_name: str
    ) -> list[IngestConfiguration]:
        """Query configurations by source name.

        Args:
            tenant_id: Tenant ID
            source_name: Source name to search for

        Returns:
            List of matching configurations
        """
        config_ids = self.list_configurations(tenant_id)
        configs = []

        for config_id in config_ids:
            try:
                config = self.load_configuration(config_id, tenant_id)
                if config.source_name == source_name:
                    configs.append(config)
            except Exception:
                continue

        return configs

    def _hash_sample(self, sample_data: list[dict[str, Any]]) -> str:
        """Generate hash of sample data for change detection."""
        # Serialize sample (first 10 rows) to stable JSON
        sample = sample_data[:10]
        canonical_json = json.dumps(sample, sort_keys=True)
        return hashlib.sha256(canonical_json.encode()).hexdigest()

    def _fingerprint_schema(self, sample_data: list[dict[str, Any]]) -> str:
        """Generate schema fingerprint from field names and types."""
        if not sample_data:
            return ""

        # Extract field names and sample types
        first_row = sample_data[0]
        schema = {
            field: type(value).__name__
            for field, value in first_row.items()
        }

        canonical_json = json.dumps(schema, sort_keys=True)
        return hashlib.sha256(canonical_json.encode()).hexdigest()

    def generate_provenance_report(
        self, config: IngestConfiguration
    ) -> dict[str, Any]:
        """Generate human-readable provenance report.

        Args:
            config: Configuration to report on

        Returns:
            Provenance report dictionary
        """
        return {
            "configuration_id": config.config_id,
            "source": {
                "name": config.source_name,
                "type": config.source_type,
                "hash": config.source_hash[:16],  # Shortened
            },
            "created": {
                "at": config.created_at,
                "by": config.created_by,
            },
            "mappings": {
                "count": len(config.field_mappings),
                "entities": list(
                    set(m.canonical_entity for m in config.field_mappings)
                ),
            },
            "pii": {
                "count": len(config.pii_handling),
                "categories": list(
                    set(p.pii_category for p in config.pii_handling)
                ),
                "requires_dpia": len(config.pii_handling) >= 3,
            },
            "license": {
                "status": config.license_decision.compliance_status
                if config.license_decision
                else "unknown",
                "reason": config.license_decision.reason
                if config.license_decision
                else None,
            },
            "provenance_chain": config.provenance_chain,
        }
