"""License enforcement for connectors."""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional


class LicenseClassification(Enum):
    """Classification of data licenses."""

    OPEN_SOURCE = "open-source"
    COMMERCIAL = "commercial"
    GOVERNMENT = "government"
    RESTRICTED = "restricted"
    INTERNAL = "internal"


class LicenseViolationError(Exception):
    """Raised when a license violation is detected."""

    pass


@dataclass
class BlockedField:
    """A field that is blocked due to license restrictions."""

    field_name: str
    reason: str
    alternative: Optional[str] = None


@dataclass
class LicenseConfig:
    """License configuration for a connector."""

    license_type: str
    classification: LicenseClassification
    attribution_required: bool
    allowed_use_cases: List[str]
    blocked_use_cases: List[str]
    blocked_fields: List[BlockedField]


class LicenseEnforcer:
    """
    Enforces license restrictions on data ingestion.
    """

    def __init__(self, config: LicenseConfig):
        self.config = config
        self.violation_log = []
        self.blocked_field_map = {bf.field_name: bf for bf in config.blocked_fields}

    def check_use_case(self, use_case: str) -> bool:
        """
        Check if a use case is allowed under the license.

        Args:
            use_case: The intended use case (e.g., "research", "commercial")

        Returns:
            True if allowed

        Raises:
            LicenseViolationError: If use case is blocked
        """
        # Check if explicitly blocked
        if use_case in self.config.blocked_use_cases:
            raise LicenseViolationError(
                f"Use case '{use_case}' is not permitted under {self.config.license_type} license"
            )

        # If allowed_use_cases is specified, must be in the list
        if self.config.allowed_use_cases and use_case not in self.config.allowed_use_cases:
            raise LicenseViolationError(
                f"Use case '{use_case}' is not in the allowed list: {self.config.allowed_use_cases}"
            )

        return True

    def filter_blocked_fields(self, record: Dict[str, Any]) -> tuple[Dict[str, Any], List[str]]:
        """
        Remove blocked fields from a record.

        Args:
            record: Data record to filter

        Returns:
            (filtered_record, list_of_blocked_fields_with_reasons)
        """
        filtered = {}
        blocked = []

        for field_name, value in record.items():
            if field_name in self.blocked_field_map:
                blocked_field = self.blocked_field_map[field_name]
                blocked.append(f"{field_name}: {blocked_field.reason}")
                self.violation_log.append(
                    {
                        "field": field_name,
                        "reason": blocked_field.reason,
                        "alternative": blocked_field.alternative,
                    }
                )
            else:
                filtered[field_name] = value

        return filtered, blocked

    def get_attribution_text(self, source_name: str = None) -> Optional[str]:
        """
        Get the attribution text if required by license.

        Args:
            source_name: Name of the data source

        Returns:
            Attribution text or None if not required
        """
        if not self.config.attribution_required:
            return None

        source = source_name or "Unknown Source"
        return f"Data licensed under {self.config.license_type}. Source: {source}"

    def get_license_summary(self) -> Dict[str, Any]:
        """Get a summary of license terms."""
        return {
            "license_type": self.config.license_type,
            "classification": self.config.classification.value,
            "attribution_required": self.config.attribution_required,
            "allowed_use_cases": self.config.allowed_use_cases,
            "blocked_use_cases": self.config.blocked_use_cases,
            "blocked_fields_count": len(self.config.blocked_fields),
            "blocked_fields": [
                {"field": bf.field_name, "reason": bf.reason} for bf in self.config.blocked_fields
            ],
        }

    def get_violation_report(self) -> Dict[str, Any]:
        """Get a report of license violations."""
        return {
            "total_violations": len(self.violation_log),
            "violations": self.violation_log,
        }

    def check_field_allowed(self, field_name: str) -> tuple[bool, Optional[str]]:
        """
        Check if a field is allowed by the license.

        Returns:
            (is_allowed, reason_if_blocked)
        """
        if field_name in self.blocked_field_map:
            return False, self.blocked_field_map[field_name].reason
        return True, None
