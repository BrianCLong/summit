"""
Data Contracts Management System
Handles schema validation, evolution, and contract enforcement
"""

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any

import jsonschema

from ..utils.logging import get_logger


class CompatibilityMode(Enum):
    """Schema compatibility modes"""

    NONE = "none"  # No compatibility checks
    BACKWARD = "backward"  # New schema can read old data
    FORWARD = "forward"  # Old schema can read new data
    FULL = "full"  # Both backward and forward compatible


@dataclass
class ContractViolation:
    """Represents a contract violation"""

    field_path: str
    violation_type: str
    expected: Any
    actual: Any
    severity: str
    message: str


@dataclass
class ValidationResult:
    """Result of contract validation"""

    is_valid: bool
    contract_version: str
    violations: list[ContractViolation]
    metadata: dict[str, Any]


class ContractValidationError(Exception):
    """Raised when contract validation fails"""

    def __init__(self, result: ValidationResult):
        self.result = result
        super().__init__(f"Contract validation failed: {len(result.violations)} violations")


class ContractManager:
    """
    Manages data contracts for sources with validation and evolution
    """

    def __init__(self, contracts_dir: Path):
        self.contracts_dir = Path(contracts_dir)
        self.logger = get_logger("contract-manager")
        self.contracts_cache: dict[str, dict[str, Any]] = {}
        self._load_contracts()

    def _load_contracts(self):
        """Load all contracts from the contracts directory"""
        if not self.contracts_dir.exists():
            self.contracts_dir.mkdir(parents=True, exist_ok=True)
            return

        for contract_file in self.contracts_dir.glob("*.json"):
            try:
                with open(contract_file) as f:
                    contract = json.load(f)

                # Extract source name from filename (e.g., twitter_v1.json -> twitter)
                source_name = contract_file.stem.split("_v")[0]
                version = contract.get("version", "1.0.0")

                if source_name not in self.contracts_cache:
                    self.contracts_cache[source_name] = {}

                self.contracts_cache[source_name][version] = contract
                self.logger.info(f"Loaded contract {source_name} v{version}")

            except Exception as e:
                self.logger.error(f"Failed to load contract {contract_file}: {e}")

    def get_contract(self, source_name: str, version: str | None = None) -> dict[str, Any] | None:
        """Get contract for a source, optionally specific version"""
        if source_name not in self.contracts_cache:
            return None

        source_contracts = self.contracts_cache[source_name]

        if version:
            return source_contracts.get(version)

        # Return latest version if no version specified
        if source_contracts:
            latest_version = max(
                source_contracts.keys(), key=lambda v: tuple(map(int, v.split(".")))
            )
            return source_contracts[latest_version]

        return None

    def validate_record(
        self,
        record: dict[str, Any],
        source_name: str,
        contract_version: str | None = None,
        strict: bool = True,
    ) -> ValidationResult:
        """
        Validate a single record against its contract

        Args:
            record: The data record to validate
            source_name: Name of the data source
            contract_version: Specific contract version (uses latest if None)
            strict: Whether to raise exception on validation failure

        Returns:
            ValidationResult with validation status and violations
        """
        contract = self.get_contract(source_name, contract_version)

        if not contract:
            if strict:
                raise ContractValidationError(
                    ValidationResult(
                        is_valid=False,
                        contract_version="unknown",
                        violations=[
                            ContractViolation(
                                field_path="__contract__",
                                violation_type="missing_contract",
                                expected="contract exists",
                                actual="no contract found",
                                severity="critical",
                                message=f"No contract found for source {source_name}",
                            )
                        ],
                        metadata={"source": source_name},
                    )
                )
            else:
                # Return valid result if contract is missing and not strict
                return ValidationResult(
                    is_valid=True,
                    contract_version="none",
                    violations=[],
                    metadata={"source": source_name, "contract_status": "missing"},
                )

        violations = []
        contract_version = contract.get("version", "1.0.0")

        try:
            # JSON Schema validation
            jsonschema.validate(record, contract, format_checker=jsonschema.FormatChecker())

        except jsonschema.ValidationError as e:
            violations.append(
                ContractViolation(
                    field_path=".".join(str(p) for p in e.absolute_path),
                    violation_type="schema_violation",
                    expected=str(e.schema),
                    actual=e.instance,
                    severity="error",
                    message=e.message,
                )
            )

        except jsonschema.SchemaError as e:
            violations.append(
                ContractViolation(
                    field_path="__schema__",
                    violation_type="invalid_schema",
                    expected="valid JSON schema",
                    actual="invalid schema",
                    severity="critical",
                    message=str(e),
                )
            )

        # Custom business rule validations
        custom_violations = self._validate_custom_rules(record, contract)
        violations.extend(custom_violations)

        # SLA compliance checks
        sla_violations = self._validate_sla_compliance(record, contract)
        violations.extend(sla_violations)

        result = ValidationResult(
            is_valid=len([v for v in violations if v.severity in ["error", "critical"]]) == 0,
            contract_version=contract_version,
            violations=violations,
            metadata={
                "source": source_name,
                "validation_timestamp": datetime.now().isoformat(),
                "contract_hash": self._get_contract_hash(contract),
            },
        )

        if not result.is_valid and strict:
            raise ContractValidationError(result)

        return result

    def validate_batch(
        self,
        records: list[dict[str, Any]],
        source_name: str,
        contract_version: str | None = None,
        fail_fast: bool = False,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
        """
        Validate a batch of records against contract

        Returns:
            Tuple of (valid_records, invalid_records, batch_stats)
        """
        valid_records = []
        invalid_records = []
        all_violations = []

        for i, record in enumerate(records):
            try:
                result = self.validate_record(record, source_name, contract_version, strict=False)

                if result.is_valid:
                    # Add validation metadata to record
                    record["_contract_validation"] = {
                        "validated_at": result.metadata["validation_timestamp"],
                        "contract_version": result.contract_version,
                        "contract_hash": result.metadata.get("contract_hash"),
                    }
                    valid_records.append(record)
                else:
                    # Add violation details to invalid record
                    record["_contract_violations"] = [
                        {
                            "field": v.field_path,
                            "type": v.violation_type,
                            "severity": v.severity,
                            "message": v.message,
                        }
                        for v in result.violations
                    ]
                    invalid_records.append(record)

                    if fail_fast:
                        break

                all_violations.extend(result.violations)

            except Exception as e:
                # Handle unexpected validation errors
                record["_validation_error"] = str(e)
                invalid_records.append(record)
                self.logger.error(f"Unexpected validation error for record {i}: {e}")

        # Calculate batch statistics
        batch_stats = {
            "total_records": len(records),
            "valid_records": len(valid_records),
            "invalid_records": len(invalid_records),
            "validation_rate": len(valid_records) / len(records) if records else 0,
            "violation_counts": self._count_violations_by_type(all_violations),
            "source": source_name,
            "batch_timestamp": datetime.now().isoformat(),
        }

        return valid_records, invalid_records, batch_stats

    def _validate_custom_rules(
        self, record: dict[str, Any], contract: dict[str, Any]
    ) -> list[ContractViolation]:
        """Apply custom business rules defined in contract"""
        violations = []
        custom_rules = contract.get("custom_rules", [])

        for rule in custom_rules:
            rule_type = rule.get("type")

            if rule_type == "uniqueness":
                # Check for uniqueness constraints (would require state tracking)
                pass
            elif rule_type == "referential_integrity":
                # Check foreign key constraints
                pass
            elif rule_type == "data_range":
                # Check value ranges
                field = rule.get("field")
                min_val = rule.get("min")
                max_val = rule.get("max")

                if field in record:
                    value = record[field]
                    if min_val is not None and value < min_val:
                        violations.append(
                            ContractViolation(
                                field_path=field,
                                violation_type="range_violation",
                                expected=f">= {min_val}",
                                actual=value,
                                severity="warning",
                                message=f"Value {value} below minimum {min_val}",
                            )
                        )
                    if max_val is not None and value > max_val:
                        violations.append(
                            ContractViolation(
                                field_path=field,
                                violation_type="range_violation",
                                expected=f"<= {max_val}",
                                actual=value,
                                severity="warning",
                                message=f"Value {value} above maximum {max_val}",
                            )
                        )

        return violations

    def _validate_sla_compliance(
        self, record: dict[str, Any], contract: dict[str, Any]
    ) -> list[ContractViolation]:
        """Validate SLA compliance metrics"""
        violations = []
        sla = contract.get("sla", {})

        # Check data freshness
        freshness_hours = sla.get("freshness_hours")
        if freshness_hours and "created_at" in record:
            try:
                created_at = datetime.fromisoformat(record["created_at"].replace("Z", "+00:00"))
                age_hours = (
                    datetime.now().replace(tzinfo=created_at.tzinfo) - created_at
                ).total_seconds() / 3600

                if age_hours > freshness_hours:
                    violations.append(
                        ContractViolation(
                            field_path="created_at",
                            violation_type="freshness_violation",
                            expected=f"<= {freshness_hours} hours old",
                            actual=f"{age_hours:.2f} hours old",
                            severity="warning",
                            message=f"Data is {age_hours:.2f} hours old, exceeds SLA of {freshness_hours} hours",
                        )
                    )
            except (ValueError, TypeError) as e:
                violations.append(
                    ContractViolation(
                        field_path="created_at",
                        violation_type="timestamp_format",
                        expected="valid ISO timestamp",
                        actual=record.get("created_at"),
                        severity="error",
                        message=f"Invalid timestamp format: {e}",
                    )
                )

        return violations

    def _get_contract_hash(self, contract: dict[str, Any]) -> str:
        """Generate hash of contract for change detection"""
        # Remove metadata that doesn't affect validation
        contract_copy = contract.copy()
        contract_copy.pop("metadata", None)
        contract_copy.pop("examples", None)

        contract_str = json.dumps(contract_copy, sort_keys=True)
        return hashlib.md5(contract_str.encode()).hexdigest()

    def _count_violations_by_type(self, violations: list[ContractViolation]) -> dict[str, int]:
        """Count violations by type and severity"""
        counts = {}
        for violation in violations:
            key = f"{violation.violation_type}_{violation.severity}"
            counts[key] = counts.get(key, 0) + 1
        return counts

    def check_schema_compatibility(
        self,
        old_schema: dict[str, Any],
        new_schema: dict[str, Any],
        mode: CompatibilityMode = CompatibilityMode.BACKWARD,
    ) -> tuple[bool, list[str]]:
        """
        Check if schema evolution maintains compatibility

        Returns:
            Tuple of (is_compatible, compatibility_issues)
        """
        issues = []

        if mode == CompatibilityMode.NONE:
            return True, []

        # Check backward compatibility (new schema can read old data)
        if mode in [CompatibilityMode.BACKWARD, CompatibilityMode.FULL]:
            backward_issues = self._check_backward_compatibility(old_schema, new_schema)
            issues.extend(backward_issues)

        # Check forward compatibility (old schema can read new data)
        if mode in [CompatibilityMode.FORWARD, CompatibilityMode.FULL]:
            forward_issues = self._check_forward_compatibility(old_schema, new_schema)
            issues.extend(forward_issues)

        return len(issues) == 0, issues

    def _check_backward_compatibility(
        self, old_schema: dict[str, Any], new_schema: dict[str, Any]
    ) -> list[str]:
        """Check if new schema can read data written with old schema"""
        issues = []

        old_props = old_schema.get("properties", {})
        new_props = new_schema.get("properties", {})
        old_required = set(old_schema.get("required", []))
        new_required = set(new_schema.get("required", []))

        # Check for removed required fields
        removed_required = old_required - new_required
        for field in removed_required:
            issues.append(f"Required field '{field}' removed (backward incompatible)")

        # Check for type changes in existing fields
        for field_name, old_prop in old_props.items():
            if field_name in new_props:
                new_prop = new_props[field_name]
                if old_prop.get("type") != new_prop.get("type"):
                    issues.append(
                        f"Field '{field_name}' type changed from {old_prop.get('type')} to {new_prop.get('type')}"
                    )

        return issues

    def _check_forward_compatibility(
        self, old_schema: dict[str, Any], new_schema: dict[str, Any]
    ) -> list[str]:
        """Check if old schema can read data written with new schema"""
        issues = []

        old_props = old_schema.get("properties", {})
        new_props = new_schema.get("properties", {})
        old_required = set(old_schema.get("required", []))
        new_required = set(new_schema.get("required", []))

        # Check for new required fields
        added_required = new_required - old_required
        for field in added_required:
            issues.append(f"Required field '{field}' added (forward incompatible)")

        # Check if additionalProperties is disabled and new fields added
        if old_schema.get("additionalProperties") is False:
            new_fields = set(new_props.keys()) - set(old_props.keys())
            if new_fields:
                issues.append(f"New fields {new_fields} added but additionalProperties=false")

        return issues


class SchemaEvolutionManager:
    """
    Manages schema evolution and migration planning
    """

    def __init__(self, contracts_manager: ContractManager):
        self.contracts_manager = contracts_manager
        self.logger = get_logger("schema-evolution")

    def plan_migration(
        self, source_name: str, from_version: str, to_version: str
    ) -> dict[str, Any]:
        """
        Create a migration plan between schema versions
        """
        old_contract = self.contracts_manager.get_contract(source_name, from_version)
        new_contract = self.contracts_manager.get_contract(source_name, to_version)

        if not old_contract or not new_contract:
            raise ValueError(
                f"Cannot find contracts for {source_name} versions {from_version} or {to_version}"
            )

        # Check compatibility
        compatibility_mode = CompatibilityMode(
            new_contract.get("sla", {}).get("schema_compatibility", "backward")
        )

        is_compatible, issues = self.contracts_manager.check_schema_compatibility(
            old_contract, new_contract, compatibility_mode
        )

        # Generate migration steps
        migration_steps = self._generate_migration_steps(old_contract, new_contract)

        # Estimate impact
        impact_analysis = self._analyze_consumer_impact(source_name, old_contract, new_contract)

        return {
            "source": source_name,
            "from_version": from_version,
            "to_version": to_version,
            "is_compatible": is_compatible,
            "compatibility_issues": issues,
            "migration_steps": migration_steps,
            "impact_analysis": impact_analysis,
            "created_at": datetime.now().isoformat(),
        }

    def _generate_migration_steps(
        self, old_schema: dict[str, Any], new_schema: dict[str, Any]
    ) -> list[dict[str, str]]:
        """Generate step-by-step migration instructions"""
        steps = []

        old_props = old_schema.get("properties", {})
        new_props = new_schema.get("properties", {})

        # Added fields
        added_fields = set(new_props.keys()) - set(old_props.keys())
        for field in added_fields:
            steps.append(
                {
                    "type": "add_field",
                    "field": field,
                    "action": f"Add new field '{field}' with type {new_props[field].get('type')}",
                    "default_value": new_props[field].get("default"),
                }
            )

        # Removed fields
        removed_fields = set(old_props.keys()) - set(new_props.keys())
        for field in removed_fields:
            steps.append(
                {
                    "type": "remove_field",
                    "field": field,
                    "action": f"Remove field '{field}' - ensure no dependencies exist",
                }
            )

        # Modified fields
        for field in set(old_props.keys()) & set(new_props.keys()):
            old_prop = old_props[field]
            new_prop = new_props[field]

            if old_prop.get("type") != new_prop.get("type"):
                steps.append(
                    {
                        "type": "modify_field_type",
                        "field": field,
                        "action": f"Change type of '{field}' from {old_prop.get('type')} to {new_prop.get('type')}",
                        "requires_data_migration": True,
                    }
                )

        return steps

    def _analyze_consumer_impact(
        self, source_name: str, old_schema: dict[str, Any], new_schema: dict[str, Any]
    ) -> dict[str, Any]:
        """Analyze impact on downstream consumers"""
        return {
            "high_risk_changes": [],
            "medium_risk_changes": [],
            "low_risk_changes": [],
            "estimated_downtime_minutes": 0,
            "consumers_to_notify": [],
            "rollback_plan": "Revert to previous contract version and replay failed records",
        }
