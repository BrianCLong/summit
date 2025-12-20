"""Manifest validator for connector SDK."""

from pathlib import Path
from typing import Any, Dict, List

import yaml


class ManifestValidator:
    """Validates connector manifests against the SDK schema."""

    REQUIRED_FIELDS = [
        "name",
        "description",
        "version",
        "ingestion_type",
        "supported_formats",
        "schema_mapping_file",
        "sample_data_file",
    ]

    VALID_INGESTION_TYPES = ["batch", "streaming", "hybrid"]

    RECOMMENDED_FIELDS = [
        "rate_limit",
        "pii_flags",
        "license",
        "retention_policy",
        "dependencies",
        "golden_io_tests",
    ]

    def __init__(self, manifest_path: str):
        self.manifest_path = Path(manifest_path)
        self.manifest = self._load_manifest()
        self.errors = []
        self.warnings = []

    def _load_manifest(self) -> Dict[str, Any]:
        """Load the manifest file."""
        try:
            with open(self.manifest_path) as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.errors.append(f"Failed to load manifest: {e}")
            return {}

    def validate(self) -> bool:
        """
        Validate the manifest.

        Returns:
            True if valid (no errors), False otherwise
        """
        self._validate_required_fields()
        self._validate_ingestion_type()
        self._validate_rate_limit()
        self._validate_pii_flags()
        self._validate_license()
        self._validate_file_references()
        self._check_recommended_fields()

        return len(self.errors) == 0

    def _validate_required_fields(self):
        """Check that all required fields are present."""
        for field in self.REQUIRED_FIELDS:
            if field not in self.manifest:
                self.errors.append(f"Missing required field: {field}")

    def _validate_ingestion_type(self):
        """Validate ingestion_type value."""
        ingestion_type = self.manifest.get("ingestion_type")
        if ingestion_type and ingestion_type not in self.VALID_INGESTION_TYPES:
            self.errors.append(
                f"Invalid ingestion_type: {ingestion_type}. "
                f"Must be one of: {self.VALID_INGESTION_TYPES}"
            )

    def _validate_rate_limit(self):
        """Validate rate_limit configuration."""
        if "rate_limit" not in self.manifest:
            self.warnings.append("No rate_limit configured")
            return

        rl = self.manifest["rate_limit"]
        if not isinstance(rl, dict):
            self.errors.append("rate_limit must be a dictionary")
            return

        # Check required rate limit fields
        if "requests_per_hour" not in rl and "requests_per_minute" not in rl:
            self.errors.append("rate_limit must specify requests_per_hour or requests_per_minute")

        # Validate numeric fields
        numeric_fields = ["requests_per_hour", "requests_per_minute", "burst_limit", "max_retries"]
        for field in numeric_fields:
            if field in rl and not isinstance(rl[field], int):
                self.errors.append(f"rate_limit.{field} must be an integer")

        # Validate backoff_strategy
        if "backoff_strategy" in rl:
            valid_strategies = ["exponential", "linear", "fixed"]
            if rl["backoff_strategy"] not in valid_strategies:
                self.errors.append(
                    f"Invalid backoff_strategy: {rl['backoff_strategy']}. "
                    f"Must be one of: {valid_strategies}"
                )

    def _validate_pii_flags(self):
        """Validate PII flags configuration."""
        if "pii_flags" not in self.manifest:
            self.warnings.append("No pii_flags configured")
            return

        pii_flags = self.manifest["pii_flags"]
        if not isinstance(pii_flags, list):
            self.errors.append("pii_flags must be a list")
            return

        valid_severities = ["low", "medium", "high", "critical"]
        valid_policies = ["allow", "redact", "block", "prompt"]

        for i, pii_field in enumerate(pii_flags):
            if isinstance(pii_field, dict):
                # Structured PII field
                if "field_name" not in pii_field:
                    self.errors.append(f"pii_flags[{i}] missing field_name")

                if "severity" in pii_field and pii_field["severity"] not in valid_severities:
                    self.errors.append(
                        f"pii_flags[{i}] invalid severity: {pii_field['severity']}"
                    )

                if (
                    "redaction_policy" in pii_field
                    and pii_field["redaction_policy"] not in valid_policies
                ):
                    self.errors.append(
                        f"pii_flags[{i}] invalid redaction_policy: {pii_field['redaction_policy']}"
                    )

    def _validate_license(self):
        """Validate license configuration."""
        if "license" not in self.manifest:
            self.warnings.append("No license configured")
            return

        lic = self.manifest["license"]

        # License can be a simple string or a dict
        if isinstance(lic, str):
            return  # Simple license type is valid

        if not isinstance(lic, dict):
            self.errors.append("license must be a string or dictionary")
            return

        # If dict, check for required fields
        if "type" not in lic:
            self.errors.append("license.type is required when license is a dictionary")

        # Validate classification
        if "classification" in lic:
            valid_classifications = ["open-source", "commercial", "government", "restricted"]
            if lic["classification"] not in valid_classifications:
                self.errors.append(
                    f"Invalid license.classification: {lic['classification']}. "
                    f"Must be one of: {valid_classifications}"
                )

        # Validate blocked_fields
        if "blocked_fields" in lic:
            if not isinstance(lic["blocked_fields"], list):
                self.errors.append("license.blocked_fields must be a list")
            else:
                for i, bf in enumerate(lic["blocked_fields"]):
                    if not isinstance(bf, dict):
                        self.errors.append(f"license.blocked_fields[{i}] must be a dictionary")
                    elif "field_name" not in bf or "reason" not in bf:
                        self.errors.append(
                            f"license.blocked_fields[{i}] must have field_name and reason"
                        )

    def _validate_file_references(self):
        """Validate that referenced files exist."""
        connector_dir = self.manifest_path.parent

        # Check schema_mapping_file
        if "schema_mapping_file" in self.manifest:
            schema_file = connector_dir / self.manifest["schema_mapping_file"]
            if not schema_file.exists():
                self.errors.append(f"schema_mapping_file not found: {schema_file}")

        # Check sample_data_file
        if "sample_data_file" in self.manifest:
            sample_file = connector_dir / self.manifest["sample_data_file"]
            if not sample_file.exists():
                self.errors.append(f"sample_data_file not found: {sample_file}")

        # Check golden_io_tests
        if "golden_io_tests" in self.manifest:
            for test_file in self.manifest["golden_io_tests"]:
                # Look for test file in __tests__ directory
                test_path = connector_dir.parent / "__tests__" / test_file
                if not test_path.exists():
                    self.warnings.append(f"golden_io_test file not found: {test_path}")

    def _check_recommended_fields(self):
        """Check for recommended but optional fields."""
        for field in self.RECOMMENDED_FIELDS:
            if field not in self.manifest:
                self.warnings.append(f"Recommended field not present: {field}")

    def get_report(self) -> Dict[str, Any]:
        """Get validation report."""
        return {
            "valid": len(self.errors) == 0,
            "errors": self.errors,
            "warnings": self.warnings,
            "manifest": self.manifest,
        }


def validate_manifest(manifest_path: str) -> Dict[str, Any]:
    """
    Validate a connector manifest.

    Args:
        manifest_path: Path to manifest.yaml

    Returns:
        Validation report dict
    """
    validator = ManifestValidator(manifest_path)
    validator.validate()
    return validator.get_report()
