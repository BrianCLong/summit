"""
Privacy and GDPR Compliance System
PII detection, masking, anonymization, and consent management
"""

import hashlib
import hmac
import json
import re
import secrets
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any

try:
    import pandas as pd

    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

from ..utils.logging import get_logger


class PIIType(Enum):
    """Types of Personally Identifiable Information"""

    EMAIL = "email"
    PHONE = "phone"
    SSN = "ssn"
    CREDIT_CARD = "credit_card"
    NAME = "name"
    ADDRESS = "address"
    IP_ADDRESS = "ip_address"
    PASSPORT = "passport"
    DRIVER_LICENSE = "driver_license"
    DATE_OF_BIRTH = "date_of_birth"
    BIOMETRIC = "biometric"
    FINANCIAL = "financial"
    CUSTOM = "custom"


class MaskingStrategy(Enum):
    """Data masking strategies"""

    REDACTION = "redaction"  # Replace with [REDACTED]
    TOKENIZATION = "tokenization"  # Replace with consistent tokens
    HASHING = "hashing"  # One-way hash
    ENCRYPTION = "encryption"  # Reversible encryption
    PARTIAL_MASK = "partial_mask"  # Show only partial data
    SYNTHETIC = "synthetic"  # Replace with synthetic data
    NULLIFICATION = "nullification"  # Replace with null/empty


class ConsentStatus(Enum):
    """Consent status for data processing"""

    GRANTED = "granted"
    DENIED = "denied"
    PENDING = "pending"
    WITHDRAWN = "withdrawn"
    EXPIRED = "expired"


class ProcessingPurpose(Enum):
    """Legal basis for data processing under GDPR"""

    CONSENT = "consent"
    CONTRACT = "contract"
    LEGAL_OBLIGATION = "legal_obligation"
    VITAL_INTERESTS = "vital_interests"
    PUBLIC_TASK = "public_task"
    LEGITIMATE_INTERESTS = "legitimate_interests"


@dataclass
class PIIDetectionRule:
    """Rule for detecting PII in data"""

    pii_type: PIIType
    pattern: str
    confidence: float  # 0.0 to 1.0
    field_names: list[str] | None = None  # Field names to check
    description: str | None = None


class PIIDetectionResult:
    """Result of PII detection"""

    def __init__(
        self, field: str, pii_type: PIIType, confidence: float, value: Any, masked_value: Any = None
    ):
        self.field = field
        self.pii_type = pii_type
        self.confidence = confidence
        self.value = value
        self.masked_value = masked_value
        self.detected_at = datetime.now()


@dataclass
class ConsentRecord:
    """Record of user consent for data processing"""

    user_id: str
    purpose: ProcessingPurpose
    status: ConsentStatus
    granted_at: datetime | None = None
    withdrawn_at: datetime | None = None
    expires_at: datetime | None = None
    data_categories: list[str] | None = None
    legal_basis: str | None = None
    consent_version: str = "1.0"

    def is_valid(self) -> bool:
        """Check if consent is currently valid"""
        if self.status != ConsentStatus.GRANTED:
            return False

        if self.expires_at and datetime.now() > self.expires_at:
            return False

        return True


class PIIDetector:
    """
    Detects PII in structured and unstructured data
    """

    def __init__(self):
        self.logger = get_logger("pii-detector")
        self.detection_rules = self._initialize_default_rules()
        self.custom_rules: list[PIIDetectionRule] = []

        # Performance optimization
        self.compiled_patterns: dict[PIIType, re.Pattern] = {}
        self._compile_patterns()

    def _initialize_default_rules(self) -> list[PIIDetectionRule]:
        """Initialize default PII detection rules"""
        return [
            PIIDetectionRule(
                pii_type=PIIType.EMAIL,
                pattern=r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
                confidence=0.95,
                field_names=["email", "email_address", "mail"],
                description="Email address pattern",
            ),
            PIIDetectionRule(
                pii_type=PIIType.PHONE,
                pattern=r"(\+?1[-.\s]?)?(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})",
                confidence=0.85,
                field_names=["phone", "telephone", "mobile", "cell"],
                description="Phone number pattern",
            ),
            PIIDetectionRule(
                pii_type=PIIType.SSN,
                pattern=r"\b\d{3}-?\d{2}-?\d{4}\b",
                confidence=0.90,
                field_names=["ssn", "social_security", "social_security_number"],
                description="Social Security Number",
            ),
            PIIDetectionRule(
                pii_type=PIIType.CREDIT_CARD,
                pattern=r"\b(?:\d{4}[-\s]?){3}\d{4}\b",
                confidence=0.80,
                field_names=["credit_card", "card_number", "cc_number"],
                description="Credit card number",
            ),
            PIIDetectionRule(
                pii_type=PIIType.IP_ADDRESS,
                pattern=r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
                confidence=0.90,
                field_names=["ip", "ip_address", "client_ip"],
                description="IPv4 address",
            ),
            PIIDetectionRule(
                pii_type=PIIType.NAME,
                pattern=r"\b[A-Z][a-z]+ [A-Z][a-z]+\b",
                confidence=0.60,
                field_names=["name", "full_name", "first_name", "last_name"],
                description="Person name pattern",
            ),
        ]

    def _compile_patterns(self):
        """Compile regex patterns for better performance"""
        for rule in self.detection_rules + self.custom_rules:
            if rule.pii_type not in self.compiled_patterns:
                try:
                    self.compiled_patterns[rule.pii_type] = re.compile(rule.pattern, re.IGNORECASE)
                except re.error as e:
                    self.logger.warning(f"Invalid regex pattern for {rule.pii_type}: {e}")

    def add_custom_rule(self, rule: PIIDetectionRule):
        """Add custom PII detection rule"""
        self.custom_rules.append(rule)
        self._compile_patterns()
        self.logger.info(f"Added custom PII rule for {rule.pii_type.value}")

    def detect_pii_in_record(self, record: dict[str, Any]) -> list[PIIDetectionResult]:
        """Detect PII in a single record"""
        results = []

        for field, value in record.items():
            if value is None:
                continue

            # Convert to string for pattern matching
            str_value = str(value)

            # Check each detection rule
            for rule in self.detection_rules + self.custom_rules:
                # Field name matching
                if rule.field_names and field.lower() in [fn.lower() for fn in rule.field_names]:
                    confidence = min(
                        rule.confidence + 0.1, 1.0
                    )  # Boost confidence for field name match
                    results.append(PIIDetectionResult(field, rule.pii_type, confidence, value))
                    continue

                # Pattern matching
                if rule.pii_type in self.compiled_patterns:
                    pattern = self.compiled_patterns[rule.pii_type]
                    if pattern.search(str_value):
                        results.append(
                            PIIDetectionResult(field, rule.pii_type, rule.confidence, value)
                        )

        return results

    def detect_pii_in_dataframe(self, df: "pd.DataFrame") -> dict[str, list[PIIDetectionResult]]:
        """Detect PII in pandas DataFrame"""
        if not PANDAS_AVAILABLE:
            raise ImportError("pandas is required for DataFrame PII detection")

        results = {}

        for index, row in df.iterrows():
            record_results = self.detect_pii_in_record(row.to_dict())
            if record_results:
                results[str(index)] = record_results

        return results

    def scan_text_for_pii(self, text: str) -> list[PIIDetectionResult]:
        """Scan unstructured text for PII"""
        results = []

        for rule in self.detection_rules + self.custom_rules:
            if rule.pii_type in self.compiled_patterns:
                pattern = self.compiled_patterns[rule.pii_type]
                matches = pattern.finditer(text)

                for match in matches:
                    results.append(
                        PIIDetectionResult(
                            field="text_content",
                            pii_type=rule.pii_type,
                            confidence=rule.confidence,
                            value=match.group(),
                        )
                    )

        return results


class DataMasker:
    """
    Masks or anonymizes PII data using various strategies
    """

    def __init__(self, encryption_key: bytes | None = None):
        self.logger = get_logger("data-masker")
        self.encryption_key = encryption_key or self._generate_encryption_key()

        # Token mapping for consistent tokenization
        self.token_mapping: dict[str, str] = {}

        # Synthetic data generators
        self.synthetic_generators = self._initialize_synthetic_generators()

    def _generate_encryption_key(self) -> bytes:
        """Generate encryption key for reversible masking"""
        return secrets.token_bytes(32)  # 256-bit key

    def _initialize_synthetic_generators(self) -> dict[PIIType, Callable]:
        """Initialize synthetic data generators"""
        return {
            PIIType.EMAIL: lambda: f"user{secrets.randbelow(10000)}@example.com",
            PIIType.PHONE: lambda: f"+1{secrets.randbelow(900) + 100}{secrets.randbelow(900) + 100}{secrets.randbelow(9000) + 1000}",
            PIIType.NAME: lambda: f"Person{secrets.randbelow(10000)}",
            PIIType.IP_ADDRESS: lambda: f"{secrets.randbelow(256)}.{secrets.randbelow(256)}.{secrets.randbelow(256)}.{secrets.randbelow(256)}",
        }

    def mask_value(self, value: Any, pii_type: PIIType, strategy: MaskingStrategy) -> Any:
        """Mask a single value based on strategy"""

        if value is None:
            return None

        str_value = str(value)

        if strategy == MaskingStrategy.REDACTION:
            return "[REDACTED]"

        elif strategy == MaskingStrategy.NULLIFICATION:
            return None

        elif strategy == MaskingStrategy.TOKENIZATION:
            return self._tokenize_value(str_value, pii_type)

        elif strategy == MaskingStrategy.HASHING:
            return self._hash_value(str_value)

        elif strategy == MaskingStrategy.ENCRYPTION:
            return self._encrypt_value(str_value)

        elif strategy == MaskingStrategy.PARTIAL_MASK:
            return self._partial_mask_value(str_value, pii_type)

        elif strategy == MaskingStrategy.SYNTHETIC:
            return self._generate_synthetic_value(pii_type)

        else:
            self.logger.warning(f"Unknown masking strategy: {strategy}")
            return "[MASKED]"

    def mask_record(
        self,
        record: dict[str, Any],
        pii_detections: list[PIIDetectionResult],
        strategy_map: dict[PIIType, MaskingStrategy] | None = None,
    ) -> dict[str, Any]:
        """Mask PII in a record"""

        if not strategy_map:
            strategy_map = {pii_type: MaskingStrategy.REDACTION for pii_type in PIIType}

        masked_record = record.copy()

        for detection in pii_detections:
            field = detection.field
            pii_type = detection.pii_type

            if pii_type in strategy_map:
                strategy = strategy_map[pii_type]
                masked_value = self.mask_value(detection.value, pii_type, strategy)
                masked_record[field] = masked_value

                self.logger.debug(f"Masked {field} ({pii_type.value}) using {strategy.value}")

        return masked_record

    def mask_dataframe(
        self,
        df: "pd.DataFrame",
        pii_detections: dict[str, list[PIIDetectionResult]],
        strategy_map: dict[PIIType, MaskingStrategy] | None = None,
    ) -> "pd.DataFrame":
        """Mask PII in pandas DataFrame"""

        if not PANDAS_AVAILABLE:
            raise ImportError("pandas is required for DataFrame masking")

        masked_df = df.copy()

        for row_index, detections in pii_detections.items():
            if int(row_index) < len(masked_df):
                row_dict = masked_df.iloc[int(row_index)].to_dict()
                masked_row_dict = self.mask_record(row_dict, detections, strategy_map)

                # Update DataFrame row
                for field, masked_value in masked_row_dict.items():
                    if field in masked_df.columns:
                        masked_df.at[int(row_index), field] = masked_value

        return masked_df

    def _tokenize_value(self, value: str, pii_type: PIIType) -> str:
        """Create consistent tokens for values"""
        # Use HMAC for consistent tokenization
        key = f"{pii_type.value}:{value}"

        if key in self.token_mapping:
            return self.token_mapping[key]

        # Generate token
        token_hash = hmac.new(self.encryption_key, key.encode(), hashlib.sha256).hexdigest()[:8]
        token = f"{pii_type.value.upper()}_TOKEN_{token_hash}"

        self.token_mapping[key] = token
        return token

    def _hash_value(self, value: str) -> str:
        """Create one-way hash of value"""
        return hashlib.sha256(value.encode()).hexdigest()

    def _encrypt_value(self, value: str) -> str:
        """Encrypt value (reversible)"""
        try:
            # Use first 32 bytes of key for Fernet (base64 encoded)
            import base64

            from cryptography.fernet import Fernet

            fernet_key = base64.urlsafe_b64encode(self.encryption_key)
            fernet = Fernet(fernet_key)

            encrypted = fernet.encrypt(value.encode())
            return base64.b64encode(encrypted).decode()

        except ImportError:
            self.logger.warning("cryptography package not available, using hash instead")
            return self._hash_value(value)

    def _partial_mask_value(self, value: str, pii_type: PIIType) -> str:
        """Partially mask value showing only some characters"""

        if len(value) <= 3:
            return "*" * len(value)

        if pii_type == PIIType.EMAIL:
            # Show first char and domain: j***@example.com
            at_index = value.find("@")
            if at_index > 0:
                return value[0] + "*" * (at_index - 1) + value[at_index:]

        elif pii_type == PIIType.PHONE:
            # Show last 4 digits: ***-***-1234
            if len(value) >= 4:
                return "*" * (len(value) - 4) + value[-4:]

        elif pii_type == PIIType.CREDIT_CARD:
            # Show last 4 digits: ****-****-****-1234
            cleaned = re.sub(r"[^0-9]", "", value)
            if len(cleaned) >= 4:
                return "*" * (len(cleaned) - 4) + cleaned[-4:]

        # Default: show first and last characters
        return value[0] + "*" * (len(value) - 2) + value[-1]

    def _generate_synthetic_value(self, pii_type: PIIType) -> str:
        """Generate synthetic replacement value"""
        if pii_type in self.synthetic_generators:
            return self.synthetic_generators[pii_type]()

        return f"SYNTHETIC_{pii_type.value.upper()}_{secrets.randbelow(10000)}"


class ConsentManager:
    """
    Manages user consent for data processing under GDPR
    """

    def __init__(self, storage_backend: str = "file"):
        self.logger = get_logger("consent-manager")
        self.storage_backend = storage_backend

        # In-memory consent store (would be database in production)
        self.consent_records: dict[str, list[ConsentRecord]] = {}

        # Load existing consents
        if storage_backend == "file":
            self.consent_file = "consent_records.json"
            self._load_consent_records()

    def grant_consent(
        self,
        user_id: str,
        purpose: ProcessingPurpose,
        data_categories: list[str] | None = None,
        expires_in_days: int | None = None,
    ) -> ConsentRecord:
        """Grant consent for data processing"""

        expires_at = None
        if expires_in_days:
            expires_at = datetime.now() + timedelta(days=expires_in_days)

        consent = ConsentRecord(
            user_id=user_id,
            purpose=purpose,
            status=ConsentStatus.GRANTED,
            granted_at=datetime.now(),
            expires_at=expires_at,
            data_categories=data_categories or [],
        )

        if user_id not in self.consent_records:
            self.consent_records[user_id] = []

        self.consent_records[user_id].append(consent)
        self._save_consent_records()

        self.logger.info(f"Granted consent for user {user_id}, purpose {purpose.value}")
        return consent

    def withdraw_consent(self, user_id: str, purpose: ProcessingPurpose) -> bool:
        """Withdraw consent for data processing"""

        if user_id not in self.consent_records:
            return False

        for consent in self.consent_records[user_id]:
            if consent.purpose == purpose and consent.status == ConsentStatus.GRANTED:
                consent.status = ConsentStatus.WITHDRAWN
                consent.withdrawn_at = datetime.now()

                self._save_consent_records()
                self.logger.info(f"Withdrew consent for user {user_id}, purpose {purpose.value}")
                return True

        return False

    def check_consent(self, user_id: str, purpose: ProcessingPurpose) -> bool:
        """Check if user has valid consent for specific purpose"""

        if user_id not in self.consent_records:
            return False

        for consent in self.consent_records[user_id]:
            if consent.purpose == purpose and consent.is_valid():
                return True

        return False

    def get_user_consents(self, user_id: str) -> list[ConsentRecord]:
        """Get all consent records for a user"""
        return self.consent_records.get(user_id, [])

    def get_expired_consents(self) -> list[ConsentRecord]:
        """Get all expired consent records"""
        expired = []

        for user_consents in self.consent_records.values():
            for consent in user_consents:
                if (
                    consent.expires_at
                    and datetime.now() > consent.expires_at
                    and consent.status == ConsentStatus.GRANTED
                ):
                    expired.append(consent)

        return expired

    def cleanup_expired_consents(self) -> int:
        """Mark expired consents and return count"""
        count = 0

        for user_consents in self.consent_records.values():
            for consent in user_consents:
                if (
                    consent.expires_at
                    and datetime.now() > consent.expires_at
                    and consent.status == ConsentStatus.GRANTED
                ):
                    consent.status = ConsentStatus.EXPIRED
                    count += 1

        if count > 0:
            self._save_consent_records()
            self.logger.info(f"Marked {count} consents as expired")

        return count

    def _load_consent_records(self):
        """Load consent records from file"""
        try:
            import os

            if os.path.exists(self.consent_file):
                with open(self.consent_file) as f:
                    data = json.load(f)

                for user_id, consents_data in data.items():
                    self.consent_records[user_id] = []
                    for consent_data in consents_data:
                        # Convert datetime strings back to datetime objects
                        if consent_data.get("granted_at"):
                            consent_data["granted_at"] = datetime.fromisoformat(
                                consent_data["granted_at"]
                            )
                        if consent_data.get("withdrawn_at"):
                            consent_data["withdrawn_at"] = datetime.fromisoformat(
                                consent_data["withdrawn_at"]
                            )
                        if consent_data.get("expires_at"):
                            consent_data["expires_at"] = datetime.fromisoformat(
                                consent_data["expires_at"]
                            )

                        consent_data["purpose"] = ProcessingPurpose(consent_data["purpose"])
                        consent_data["status"] = ConsentStatus(consent_data["status"])

                        consent = ConsentRecord(**consent_data)
                        self.consent_records[user_id].append(consent)

                self.logger.info(f"Loaded consent records for {len(self.consent_records)} users")

        except Exception as e:
            self.logger.warning(f"Could not load consent records: {e}")

    def _save_consent_records(self):
        """Save consent records to file"""
        try:
            data = {}
            for user_id, consents in self.consent_records.items():
                data[user_id] = []
                for consent in consents:
                    consent_dict = asdict(consent)
                    # Convert datetime objects to strings
                    for field in ["granted_at", "withdrawn_at", "expires_at"]:
                        if consent_dict[field]:
                            consent_dict[field] = consent_dict[field].isoformat()

                    # Convert enums to strings
                    consent_dict["purpose"] = consent.purpose.value
                    consent_dict["status"] = consent.status.value

                    data[user_id].append(consent_dict)

            with open(self.consent_file, "w") as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            self.logger.error(f"Could not save consent records: {e}")


class PrivacyGovernor:
    """
    Main privacy governance coordinator
    """

    def __init__(
        self,
        masking_strategies: dict[PIIType, MaskingStrategy] | None = None,
        encryption_key: bytes | None = None,
    ):
        self.logger = get_logger("privacy-governor")

        # Initialize components
        self.pii_detector = PIIDetector()
        self.data_masker = DataMasker(encryption_key)
        self.consent_manager = ConsentManager()

        # Default masking strategies
        self.masking_strategies = masking_strategies or {
            PIIType.EMAIL: MaskingStrategy.PARTIAL_MASK,
            PIIType.PHONE: MaskingStrategy.PARTIAL_MASK,
            PIIType.SSN: MaskingStrategy.REDACTION,
            PIIType.CREDIT_CARD: MaskingStrategy.TOKENIZATION,
            PIIType.NAME: MaskingStrategy.SYNTHETIC,
            PIIType.ADDRESS: MaskingStrategy.REDACTION,
            PIIType.IP_ADDRESS: MaskingStrategy.HASHING,
        }

        # Processing audit log
        self.audit_log: list[dict[str, Any]] = []

    def process_record_with_privacy(
        self,
        record: dict[str, Any],
        user_id: str | None = None,
        processing_purpose: ProcessingPurpose = ProcessingPurpose.LEGITIMATE_INTERESTS,
    ) -> dict[str, Any]:
        """
        Process a record with full privacy compliance

        Args:
            record: Data record to process
            user_id: User ID for consent checking
            processing_purpose: Legal basis for processing

        Returns:
            Processed record with PII handled according to policies
        """

        audit_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "processing_purpose": processing_purpose.value,
            "pii_detected": [],
            "consent_status": None,
            "actions_taken": [],
        }

        try:
            # 1. Detect PII in the record
            pii_detections = self.pii_detector.detect_pii_in_record(record)
            audit_entry["pii_detected"] = [
                {"field": d.field, "pii_type": d.pii_type.value, "confidence": d.confidence}
                for d in pii_detections
            ]

            if not pii_detections:
                # No PII detected, return original record
                audit_entry["actions_taken"].append("no_pii_detected")
                self.audit_log.append(audit_entry)
                return record

            # 2. Check consent if user_id provided
            consent_valid = True
            if user_id:
                consent_valid = self.consent_manager.check_consent(user_id, processing_purpose)
                audit_entry["consent_status"] = "valid" if consent_valid else "invalid"

                if not consent_valid:
                    # No valid consent - apply strictest masking
                    strict_strategies = {
                        pii_type: MaskingStrategy.REDACTION for pii_type in PIIType
                    }
                    masked_record = self.data_masker.mask_record(
                        record, pii_detections, strict_strategies
                    )
                    audit_entry["actions_taken"].append("strict_masking_no_consent")
                    self.audit_log.append(audit_entry)
                    return masked_record

            # 3. Apply configured masking strategies
            masked_record = self.data_masker.mask_record(
                record, pii_detections, self.masking_strategies
            )
            audit_entry["actions_taken"].append("standard_masking_applied")

            self.audit_log.append(audit_entry)
            return masked_record

        except Exception as e:
            self.logger.error(f"Privacy processing failed: {e}")
            audit_entry["error"] = str(e)
            audit_entry["actions_taken"].append("error_occurred")
            self.audit_log.append(audit_entry)

            # On error, apply strict masking as fallback
            if pii_detections:
                strict_strategies = {pii_type: MaskingStrategy.REDACTION for pii_type in PIIType}
                return self.data_masker.mask_record(record, pii_detections, strict_strategies)

            return record

    def process_dataframe_with_privacy(
        self,
        df: "pd.DataFrame",
        user_id_column: str | None = None,
        processing_purpose: ProcessingPurpose = ProcessingPurpose.LEGITIMATE_INTERESTS,
    ) -> "pd.DataFrame":
        """Process DataFrame with privacy compliance"""

        if not PANDAS_AVAILABLE:
            raise ImportError("pandas is required for DataFrame processing")

        # Detect PII across entire DataFrame
        pii_detections = self.pii_detector.detect_pii_in_dataframe(df)

        if not pii_detections:
            self.logger.info("No PII detected in DataFrame")
            return df

        self.logger.info(f"PII detected in {len(pii_detections)} rows")

        # Process each row individually if user_id_column provided
        if user_id_column and user_id_column in df.columns:
            processed_df = df.copy()

            for index, row in df.iterrows():
                user_id = row[user_id_column]
                row_detections = pii_detections.get(str(index), [])

                if row_detections:
                    processed_record = self.process_record_with_privacy(
                        row.to_dict(), str(user_id), processing_purpose
                    )

                    # Update DataFrame row
                    for field, value in processed_record.items():
                        if field in processed_df.columns:
                            processed_df.at[index, field] = value

            return processed_df

        else:
            # Apply global masking strategies
            return self.data_masker.mask_dataframe(df, pii_detections, self.masking_strategies)

    def generate_privacy_report(self) -> dict[str, Any]:
        """Generate comprehensive privacy compliance report"""

        report = {
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_processing_events": len(self.audit_log),
                "pii_detection_events": len(
                    [entry for entry in self.audit_log if entry["pii_detected"]]
                ),
                "consent_checks": len(
                    [entry for entry in self.audit_log if entry["consent_status"]]
                ),
                "masking_applications": len(
                    [
                        entry
                        for entry in self.audit_log
                        if "masking" in " ".join(entry["actions_taken"])
                    ]
                ),
            },
            "pii_types_detected": {},
            "consent_status_breakdown": {},
            "masking_strategies_used": {},
            "recent_events": self.audit_log[-10:] if self.audit_log else [],
        }

        # Analyze PII types
        for entry in self.audit_log:
            for pii_detection in entry["pii_detected"]:
                pii_type = pii_detection["pii_type"]
                if pii_type not in report["pii_types_detected"]:
                    report["pii_types_detected"][pii_type] = 0
                report["pii_types_detected"][pii_type] += 1

        # Analyze consent status
        for entry in self.audit_log:
            if entry["consent_status"]:
                status = entry["consent_status"]
                if status not in report["consent_status_breakdown"]:
                    report["consent_status_breakdown"][status] = 0
                report["consent_status_breakdown"][status] += 1

        # Add consent manager statistics
        total_users = len(self.consent_manager.consent_records)
        expired_consents = len(self.consent_manager.get_expired_consents())

        report["consent_management"] = {
            "total_users_with_consent": total_users,
            "expired_consents": expired_consents,
            "consent_by_purpose": self._get_consent_by_purpose_stats(),
        }

        return report

    def _get_consent_by_purpose_stats(self) -> dict[str, int]:
        """Get consent statistics by processing purpose"""
        stats = {}

        for user_consents in self.consent_manager.consent_records.values():
            for consent in user_consents:
                if consent.is_valid():
                    purpose = consent.purpose.value
                    if purpose not in stats:
                        stats[purpose] = 0
                    stats[purpose] += 1

        return stats

    def configure_masking_strategy(self, pii_type: PIIType, strategy: MaskingStrategy):
        """Configure masking strategy for specific PII type"""
        self.masking_strategies[pii_type] = strategy
        self.logger.info(f"Updated masking strategy for {pii_type.value} to {strategy.value}")

    def add_custom_pii_rule(
        self,
        pii_type: PIIType,
        pattern: str,
        confidence: float,
        field_names: list[str] | None = None,
    ):
        """Add custom PII detection rule"""
        rule = PIIDetectionRule(
            pii_type=pii_type, pattern=pattern, confidence=confidence, field_names=field_names
        )
        self.pii_detector.add_custom_rule(rule)


# Utility functions for common privacy operations
def create_gdpr_compliant_processor(encryption_key: bytes | None = None) -> PrivacyGovernor:
    """Create privacy governor configured for GDPR compliance"""

    # GDPR-focused masking strategies
    gdpr_strategies = {
        PIIType.EMAIL: MaskingStrategy.TOKENIZATION,
        PIIType.PHONE: MaskingStrategy.TOKENIZATION,
        PIIType.SSN: MaskingStrategy.ENCRYPTION,
        PIIType.CREDIT_CARD: MaskingStrategy.ENCRYPTION,
        PIIType.NAME: MaskingStrategy.TOKENIZATION,
        PIIType.ADDRESS: MaskingStrategy.ENCRYPTION,
        PIIType.IP_ADDRESS: MaskingStrategy.HASHING,
        PIIType.DATE_OF_BIRTH: MaskingStrategy.PARTIAL_MASK,
    }

    governor = PrivacyGovernor(gdpr_strategies, encryption_key)

    # Add GDPR-specific PII rules
    governor.add_custom_pii_rule(
        PIIType.PASSPORT, r"\b[A-Z]{1,2}\d{6,9}\b", 0.85, ["passport", "passport_number"]
    )

    return governor


def anonymize_dataset_for_research(df: "pd.DataFrame") -> "pd.DataFrame":
    """Anonymize dataset for research purposes"""

    research_strategies = {
        PIIType.EMAIL: MaskingStrategy.SYNTHETIC,
        PIIType.PHONE: MaskingStrategy.SYNTHETIC,
        PIIType.SSN: MaskingStrategy.NULLIFICATION,
        PIIType.CREDIT_CARD: MaskingStrategy.NULLIFICATION,
        PIIType.NAME: MaskingStrategy.SYNTHETIC,
        PIIType.ADDRESS: MaskingStrategy.SYNTHETIC,
        PIIType.IP_ADDRESS: MaskingStrategy.SYNTHETIC,
    }

    governor = PrivacyGovernor(research_strategies)
    return governor.process_dataframe_with_privacy(
        df, processing_purpose=ProcessingPurpose.LEGITIMATE_INTERESTS
    )
