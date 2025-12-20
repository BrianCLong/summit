"""Base connector class for IntelGraph connectors."""

import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

import yaml

from .license import LicenseConfig, LicenseEnforcer
from .pii import PIIDetector, PIIField
from .rate_limiter import RateLimiter, RateLimitConfig


class BaseConnector(ABC):
    """
    Base class for all IntelGraph connectors.

    Provides built-in support for:
    - Rate limiting
    - PII detection and redaction
    - License enforcement
    - Lineage tracking
    """

    def __init__(self, manifest_path: str):
        self.manifest_path = Path(manifest_path)
        self.manifest = self._load_manifest()
        self.connector_dir = self.manifest_path.parent

        # Initialize SDK components
        self.rate_limiter = self._init_rate_limiter()
        self.pii_detector = self._init_pii_detector()
        self.license_enforcer = self._init_license_enforcer()

        # Statistics
        self.stats = {
            "records_processed": 0,
            "records_succeeded": 0,
            "records_failed": 0,
            "pii_detections": 0,
            "license_violations": 0,
            "rate_limit_hits": 0,
            "start_time": None,
            "end_time": None,
        }

    def _load_manifest(self) -> Dict[str, Any]:
        """Load and parse the connector manifest."""
        with open(self.manifest_path) as f:
            return yaml.safe_load(f)

    def _init_rate_limiter(self) -> Optional[RateLimiter]:
        """Initialize rate limiter from manifest config."""
        if "rate_limit" not in self.manifest:
            return None

        rl_config = self.manifest["rate_limit"]
        config = RateLimitConfig(
            requests_per_hour=rl_config.get("requests_per_hour", 3600),
            requests_per_minute=rl_config.get("requests_per_minute"),
            burst_limit=rl_config.get("burst_limit", 10),
            max_retries=rl_config.get("max_retries", 3),
            timeout_seconds=rl_config.get("timeout_seconds", 30),
        )

        backoff = rl_config.get("backoff_strategy", "exponential")
        from .rate_limiter import BackoffStrategy

        config.backoff_strategy = BackoffStrategy(backoff)

        return RateLimiter(config)

    def _init_pii_detector(self) -> Optional[PIIDetector]:
        """Initialize PII detector from manifest config."""
        if "pii_flags" not in self.manifest:
            return None

        from .pii import PIISeverity, RedactionPolicy

        pii_fields = []
        for pii_config in self.manifest["pii_flags"]:
            if isinstance(pii_config, dict):
                field = PIIField(
                    field_name=pii_config.get("field_name", "unknown"),
                    description=pii_config.get("description", ""),
                    severity=PIISeverity(pii_config.get("severity", "medium")),
                    redaction_policy=RedactionPolicy(pii_config.get("redaction_policy", "allow")),
                    legal_basis=pii_config.get("legal_basis"),
                    pattern=pii_config.get("pattern"),
                )
                pii_fields.append(field)

        return PIIDetector(pii_fields) if pii_fields else None

    def _init_license_enforcer(self) -> Optional[LicenseEnforcer]:
        """Initialize license enforcer from manifest config."""
        if "license" not in self.manifest:
            return None

        from .license import BlockedField, LicenseClassification

        lic_config = self.manifest["license"]

        # Handle both simple string license and full license config
        if isinstance(lic_config, str):
            lic_config = {"type": lic_config, "classification": "open-source"}

        blocked_fields = []
        for bf in lic_config.get("blocked_fields", []):
            blocked_fields.append(
                BlockedField(
                    field_name=bf["field_name"],
                    reason=bf["reason"],
                    alternative=bf.get("alternative"),
                )
            )

        config = LicenseConfig(
            license_type=lic_config.get("type", "unknown"),
            classification=LicenseClassification(lic_config.get("classification", "open-source")),
            attribution_required=lic_config.get("attribution_required", False),
            allowed_use_cases=lic_config.get("allowed_use_cases", []),
            blocked_use_cases=lic_config.get("blocked_use_cases", []),
            blocked_fields=blocked_fields,
        )

        return LicenseEnforcer(config)

    @abstractmethod
    def fetch_raw_data(self) -> Iterator[Any]:
        """
        Fetch raw data from the source.

        Must be implemented by subclasses.

        Yields:
            Raw data items from the source
        """
        raise NotImplementedError

    @abstractmethod
    def map_to_entities(self, raw_data: Any) -> tuple[List[Dict], List[Dict]]:
        """
        Map raw data to IntelGraph entities and relationships.

        Must be implemented by subclasses.

        Args:
            raw_data: Raw data item from fetch_raw_data()

        Returns:
            (entities, relationships)
        """
        raise NotImplementedError

    def process_record(self, raw_data: Any) -> Optional[Dict[str, Any]]:
        """
        Process a single record through the full pipeline.

        Returns:
            Processed record or None if blocked
        """
        self.stats["records_processed"] += 1

        try:
            # Apply rate limiting
            if self.rate_limiter:
                try:
                    self.rate_limiter.acquire()
                except Exception:
                    self.stats["rate_limit_hits"] += 1
                    raise

            # Map to entities
            entities, relationships = self.map_to_entities(raw_data)

            # Process entities through PII and license filters
            processed_entities = []
            pii_detections = []

            for entity in entities:
                # Apply license filter
                if self.license_enforcer:
                    filtered_entity, blocked = self.license_enforcer.filter_blocked_fields(
                        entity.get("properties", {})
                    )
                    if blocked:
                        self.stats["license_violations"] += len(blocked)
                    entity["properties"] = filtered_entity

                # Apply PII detection
                if self.pii_detector:
                    processed_props, detections = self.pii_detector.process_record(
                        entity.get("properties", {})
                    )
                    entity["properties"] = processed_props
                    if detections:
                        pii_detections.extend(detections)
                        self.stats["pii_detections"] += len(detections)

                processed_entities.append(entity)

            self.stats["records_succeeded"] += 1

            return {
                "entities": processed_entities,
                "relationships": relationships,
                "pii_detections": pii_detections,
                "lineage": self._create_lineage_record(raw_data),
            }

        except Exception as e:
            self.stats["records_failed"] += 1
            raise

    def _create_lineage_record(self, raw_data: Any) -> Dict[str, Any]:
        """Create a lineage record for this data."""
        lineage_config = self.manifest.get("lineage", {})

        if not lineage_config.get("enabled", True):
            return {}

        return {
            "source_connector": self.manifest["name"],
            "source_system": lineage_config.get("source_system", "unknown"),
            "data_classification": lineage_config.get("data_classification", "internal"),
            "ingestion_timestamp": time.time(),
            "connector_version": self.manifest["version"],
        }

    def run(self) -> Dict[str, Any]:
        """
        Run the full connector pipeline.

        Returns:
            Summary statistics
        """
        self.stats["start_time"] = time.time()

        results = []
        for raw_data in self.fetch_raw_data():
            try:
                result = self.process_record(raw_data)
                if result:
                    results.append(result)
            except Exception as e:
                print(f"Error processing record: {e}")

        self.stats["end_time"] = time.time()
        self.stats["duration_seconds"] = self.stats["end_time"] - self.stats["start_time"]

        return {
            "results": results,
            "stats": self.stats,
            "pii_report": self.pii_detector.get_pii_report() if self.pii_detector else {},
            "license_report": (
                self.license_enforcer.get_violation_report() if self.license_enforcer else {}
            ),
            "rate_limit_usage": (
                self.rate_limiter.get_current_usage() if self.rate_limiter else {}
            ),
        }

    def get_connector_info(self) -> Dict[str, Any]:
        """Get connector metadata and configuration."""
        return {
            "name": self.manifest["name"],
            "version": self.manifest["version"],
            "description": self.manifest.get("description", ""),
            "ingestion_type": self.manifest.get("ingestion_type", "unknown"),
            "supported_formats": self.manifest.get("supported_formats", []),
            "license": (
                self.license_enforcer.get_license_summary() if self.license_enforcer else {}
            ),
            "rate_limits": self.rate_limiter.config.__dict__ if self.rate_limiter else {},
            "pii_fields": (
                [f.field_name for f in self.pii_detector.pii_fields.values()]
                if self.pii_detector
                else []
            ),
        }
