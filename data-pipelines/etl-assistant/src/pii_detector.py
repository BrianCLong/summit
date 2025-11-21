"""PII detection and classification engine.

Identifies personally identifiable information (PII) in datasets and
recommends appropriate redaction strategies.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import Any


class PIICategory(Enum):
    """PII categories aligned with GDPR and privacy regulations."""
    SSN = "ssn"  # Social Security Number
    EMAIL = "email"
    PHONE = "phone"
    CREDIT_CARD = "credit_card"
    IP_ADDRESS = "ip_address"
    PASSPORT = "passport"
    DRIVERS_LICENSE = "drivers_license"
    DOB = "date_of_birth"
    FULL_NAME = "full_name"
    ADDRESS = "address"
    BIOMETRIC = "biometric"
    MEDICAL = "medical"
    FINANCIAL = "financial"
    GEOLOCATION = "geolocation"
    NONE = "none"


class PIISeverity(Enum):
    """Severity levels for PII exposure risk."""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RedactionStrategy(Enum):
    """Recommended redaction strategies."""
    NONE = "none"
    MASK = "mask"  # Partial masking (e.g., ***-**-1234)
    HASH = "hash"  # One-way hash for matching
    ENCRYPT = "encrypt"  # Reversible encryption
    TOKENIZE = "tokenize"  # Replace with token
    REMOVE = "remove"  # Complete removal


@dataclass
class PIIMatch:
    """A detected PII instance."""
    category: PIICategory
    severity: PIISeverity
    field_name: str
    sample_value: str  # Redacted sample for verification
    match_count: int
    confidence: float
    recommended_strategy: RedactionStrategy
    reasoning: str


@dataclass
class PIIScanResult:
    """Result of PII scan on a dataset."""
    pii_matches: list[PIIMatch]
    overall_risk: PIISeverity
    summary: str
    requires_dpia: bool  # Data Protection Impact Assessment


# PII detection patterns
PII_PATTERNS = {
    PIICategory.SSN: (
        re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
        PIISeverity.CRITICAL,
        RedactionStrategy.HASH,
    ),
    PIICategory.EMAIL: (
        re.compile(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b"),
        PIISeverity.MEDIUM,
        RedactionStrategy.TOKENIZE,
    ),
    PIICategory.PHONE: (
        re.compile(r"\b\+?[1-9]\d{0,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b"),
        PIISeverity.MEDIUM,
        RedactionStrategy.MASK,
    ),
    PIICategory.CREDIT_CARD: (
        re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"),
        PIISeverity.CRITICAL,
        RedactionStrategy.HASH,
    ),
    PIICategory.IP_ADDRESS: (
        re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
        PIISeverity.LOW,
        RedactionStrategy.MASK,
    ),
    PIICategory.PASSPORT: (
        re.compile(r"\b[A-Z]{1,2}\d{6,9}\b"),
        PIISeverity.CRITICAL,
        RedactionStrategy.HASH,
    ),
}

# Field name patterns that indicate PII
FIELD_NAME_INDICATORS = {
    PIICategory.SSN: ["ssn", "social_security", "social_sec", "ss_number"],
    PIICategory.EMAIL: ["email", "e_mail", "email_address"],
    PIICategory.PHONE: ["phone", "telephone", "mobile", "cell", "tel"],
    PIICategory.CREDIT_CARD: ["cc", "credit_card", "card_number", "cc_num"],
    PIICategory.DOB: ["dob", "date_of_birth", "birth_date", "birthdate"],
    PIICategory.FULL_NAME: ["name", "full_name", "first_name", "last_name", "fname", "lname"],
    PIICategory.ADDRESS: ["address", "street", "addr", "residence", "location"],
    PIICategory.PASSPORT: ["passport", "passport_number", "passport_id"],
    PIICategory.DRIVERS_LICENSE: ["license", "driver_license", "dl", "drivers_lic"],
    PIICategory.MEDICAL: ["medical", "diagnosis", "health", "patient", "medication"],
    PIICategory.FINANCIAL: ["income", "salary", "account", "balance", "tax"],
    PIICategory.GEOLOCATION: ["lat", "lon", "latitude", "longitude", "geo", "coordinates"],
}

# Severity to strategy mapping
SEVERITY_STRATEGY = {
    PIISeverity.CRITICAL: RedactionStrategy.HASH,
    PIISeverity.HIGH: RedactionStrategy.ENCRYPT,
    PIISeverity.MEDIUM: RedactionStrategy.TOKENIZE,
    PIISeverity.LOW: RedactionStrategy.MASK,
    PIISeverity.NONE: RedactionStrategy.NONE,
}


class PIIDetector:
    """Detects PII in sample data and recommends redaction."""

    def __init__(self, min_confidence: float = 0.7):
        self.min_confidence = min_confidence

    def scan(self, rows: list[dict[str, Any]]) -> PIIScanResult:
        """Scan sample rows for PII.

        Args:
            rows: List of dictionaries representing data rows

        Returns:
            PIIScanResult with detected PII and recommendations
        """
        if not rows:
            return PIIScanResult(
                pii_matches=[],
                overall_risk=PIISeverity.NONE,
                summary="No data to scan",
                requires_dpia=False,
            )

        pii_matches = []
        field_names = rows[0].keys()

        for field_name in field_names:
            pii_match = self._scan_field(field_name, rows)
            if pii_match and pii_match.confidence >= self.min_confidence:
                pii_matches.append(pii_match)

        # Determine overall risk
        overall_risk = self._calculate_overall_risk(pii_matches)

        # Determine if DPIA required
        requires_dpia = self._requires_dpia(pii_matches)

        # Generate summary
        summary = self._generate_summary(pii_matches, overall_risk)

        return PIIScanResult(
            pii_matches=pii_matches,
            overall_risk=overall_risk,
            summary=summary,
            requires_dpia=requires_dpia,
        )

    def _scan_field(
        self, field_name: str, rows: list[dict[str, Any]]
    ) -> PIIMatch | None:
        """Scan a single field for PII."""
        values = [row.get(field_name) for row in rows]
        non_null_values = [
            str(v) for v in values if v is not None and v != ""
        ]

        if not non_null_values:
            return None

        # Check field name indicators first
        normalized_name = field_name.lower().replace(" ", "_")
        for category, indicators in FIELD_NAME_INDICATORS.items():
            for indicator in indicators:
                if indicator in normalized_name:
                    severity = self._get_category_severity(category)
                    strategy = SEVERITY_STRATEGY.get(severity, RedactionStrategy.MASK)

                    # Get sample (redacted)
                    sample = self._redact_sample(non_null_values[0], category)

                    return PIIMatch(
                        category=category,
                        severity=severity,
                        field_name=field_name,
                        sample_value=sample,
                        match_count=len(non_null_values),
                        confidence=0.9,
                        recommended_strategy=strategy,
                        reasoning=f"Field name '{field_name}' indicates {category.value}",
                    )

        # Pattern-based detection
        for category, (pattern, severity, strategy) in PII_PATTERNS.items():
            matches = sum(1 for v in non_null_values if pattern.search(v))
            if matches > 0:
                confidence = matches / len(non_null_values)
                if confidence >= self.min_confidence:
                    sample = self._redact_sample(non_null_values[0], category)

                    return PIIMatch(
                        category=category,
                        severity=severity,
                        field_name=field_name,
                        sample_value=sample,
                        match_count=matches,
                        confidence=confidence,
                        recommended_strategy=strategy,
                        reasoning=f"Pattern match for {category.value} ({confidence:.0%} of samples)",
                    )

        return None

    def _get_category_severity(self, category: PIICategory) -> PIISeverity:
        """Get severity for a PII category."""
        high_severity = {
            PIICategory.SSN,
            PIICategory.CREDIT_CARD,
            PIICategory.PASSPORT,
            PIICategory.MEDICAL,
            PIICategory.BIOMETRIC,
        }

        medium_severity = {
            PIICategory.EMAIL,
            PIICategory.PHONE,
            PIICategory.DOB,
            PIICategory.FULL_NAME,
            PIICategory.FINANCIAL,
            PIICategory.DRIVERS_LICENSE,
        }

        low_severity = {
            PIICategory.IP_ADDRESS,
            PIICategory.GEOLOCATION,
        }

        if category in high_severity:
            return PIISeverity.CRITICAL
        elif category in medium_severity:
            return PIISeverity.MEDIUM
        elif category in low_severity:
            return PIISeverity.LOW

        return PIISeverity.NONE

    def _redact_sample(self, value: str, category: PIICategory) -> str:
        """Redact a sample value for display."""
        if category in [PIICategory.SSN, PIICategory.CREDIT_CARD]:
            # Show only last 4 digits
            if len(value) > 4:
                return f"***-**-{value[-4:]}"
            return "****"
        elif category == PIICategory.EMAIL:
            # Show partial email
            parts = value.split("@")
            if len(parts) == 2:
                return f"{parts[0][:2]}***@{parts[1]}"
            return "***@***.***"
        elif category == PIICategory.PHONE:
            # Show last 4 digits
            digits = re.sub(r"\D", "", value)
            if len(digits) > 4:
                return f"***-***-{digits[-4:]}"
            return "***-****"
        else:
            # Generic redaction
            if len(value) > 4:
                return f"{value[:2]}...{value[-2:]}"
            return "****"

    def _calculate_overall_risk(
        self, pii_matches: list[PIIMatch]
    ) -> PIISeverity:
        """Calculate overall risk level from PII matches."""
        if not pii_matches:
            return PIISeverity.NONE

        # Highest severity wins
        severity_order = [
            PIISeverity.CRITICAL,
            PIISeverity.HIGH,
            PIISeverity.MEDIUM,
            PIISeverity.LOW,
            PIISeverity.NONE,
        ]

        for severity in severity_order:
            if any(match.severity == severity for match in pii_matches):
                return severity

        return PIISeverity.NONE

    def _requires_dpia(self, pii_matches: list[PIIMatch]) -> bool:
        """Determine if DPIA is required based on PII detected.

        DPIA required if:
        - Critical PII detected (SSN, credit card, medical, biometric)
        - 3+ different types of PII
        - High-risk categories combined
        """
        if not pii_matches:
            return False

        # Check for critical PII
        critical_categories = {
            PIICategory.SSN,
            PIICategory.CREDIT_CARD,
            PIICategory.PASSPORT,
            PIICategory.MEDICAL,
            PIICategory.BIOMETRIC,
        }

        has_critical = any(
            match.category in critical_categories for match in pii_matches
        )

        # Count unique PII types
        unique_types = len(set(match.category for match in pii_matches))

        # DPIA required if critical PII or 3+ types
        return has_critical or unique_types >= 3

    def _generate_summary(
        self, pii_matches: list[PIIMatch], overall_risk: PIISeverity
    ) -> str:
        """Generate human-readable summary."""
        if not pii_matches:
            return "No PII detected in sample data"

        categories = set(match.category.value for match in pii_matches)
        category_list = ", ".join(sorted(categories))

        return (
            f"Detected {len(pii_matches)} PII field(s) with {overall_risk.value} risk: "
            f"{category_list}. Redaction recommended."
        )
