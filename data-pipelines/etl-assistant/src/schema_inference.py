"""Schema inference and canonical model mapping engine.

Analyzes sample data rows to infer field types, patterns, and suggests
mappings to the canonical IntelGraph model (Person, Org, Asset, Location, Event).
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class FieldType(Enum):
    """Inferred field types."""
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    DATE = "date"
    DATETIME = "datetime"
    EMAIL = "email"
    PHONE = "phone"
    URL = "url"
    COORDINATES = "coordinates"
    CURRENCY = "currency"
    UNKNOWN = "unknown"


class CanonicalEntity(Enum):
    """Canonical entity types in IntelGraph model."""
    PERSON = "Person"
    ORG = "Org"
    LOCATION = "Location"
    EVENT = "Event"
    ASSET = "Asset"
    DOCUMENT = "Document"
    INDICATOR = "Indicator"
    CASE = "Case"
    CLAIM = "Claim"


@dataclass
class FieldSchema:
    """Inferred schema for a single field."""
    name: str
    inferred_type: FieldType
    nullable: bool
    sample_values: list[Any] = field(default_factory=list)
    pattern: str | None = None
    confidence: float = 0.0  # 0.0 to 1.0


@dataclass
class MappingSuggestion:
    """Suggested mapping to canonical model."""
    source_field: str
    canonical_entity: CanonicalEntity
    canonical_property: str
    confidence: float
    reasoning: str


@dataclass
class InferredSchema:
    """Complete inferred schema with mappings."""
    fields: list[FieldSchema]
    suggested_mappings: list[MappingSuggestion]
    primary_entity: CanonicalEntity | None
    record_count: int


# Regex patterns for type detection
PATTERNS = {
    FieldType.EMAIL: re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"),
    FieldType.PHONE: re.compile(r"^\+?[1-9]\d{0,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$"),
    FieldType.URL: re.compile(r"^https?://[^\s]+$"),
    FieldType.DATE: re.compile(r"^\d{4}-\d{2}-\d{2}$"),
    FieldType.DATETIME: re.compile(r"^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}"),
    FieldType.COORDINATES: re.compile(r"^-?\d+\.?\d*,\s*-?\d+\.?\d*$"),
    FieldType.CURRENCY: re.compile(r"^[\$£€¥]\s?\d+(?:,\d{3})*(?:\.\d{2})?$"),
}

# Canonical field name mappings (deterministic suggestions)
CANONICAL_MAPPINGS = {
    # Person fields
    "first_name": (CanonicalEntity.PERSON, "firstName"),
    "last_name": (CanonicalEntity.PERSON, "lastName"),
    "full_name": (CanonicalEntity.PERSON, "name"),
    "name": (CanonicalEntity.PERSON, "name"),
    "email": (CanonicalEntity.PERSON, "email"),
    "phone": (CanonicalEntity.PERSON, "phone"),
    "dob": (CanonicalEntity.PERSON, "dateOfBirth"),
    "date_of_birth": (CanonicalEntity.PERSON, "dateOfBirth"),
    "ssn": (CanonicalEntity.PERSON, "nationalId"),
    "social_security": (CanonicalEntity.PERSON, "nationalId"),
    "address": (CanonicalEntity.PERSON, "address"),

    # Organization fields
    "company": (CanonicalEntity.ORG, "name"),
    "company_name": (CanonicalEntity.ORG, "name"),
    "organization": (CanonicalEntity.ORG, "name"),
    "org_name": (CanonicalEntity.ORG, "name"),
    "ein": (CanonicalEntity.ORG, "taxId"),
    "tax_id": (CanonicalEntity.ORG, "taxId"),
    "industry": (CanonicalEntity.ORG, "industry"),
    "sector": (CanonicalEntity.ORG, "sector"),

    # Location fields
    "city": (CanonicalEntity.LOCATION, "city"),
    "state": (CanonicalEntity.LOCATION, "state"),
    "country": (CanonicalEntity.LOCATION, "country"),
    "zip_code": (CanonicalEntity.LOCATION, "postalCode"),
    "postal_code": (CanonicalEntity.LOCATION, "postalCode"),
    "latitude": (CanonicalEntity.LOCATION, "latitude"),
    "longitude": (CanonicalEntity.LOCATION, "longitude"),
    "lat": (CanonicalEntity.LOCATION, "latitude"),
    "lon": (CanonicalEntity.LOCATION, "longitude"),
    "lng": (CanonicalEntity.LOCATION, "longitude"),

    # Event fields
    "event_date": (CanonicalEntity.EVENT, "date"),
    "event_time": (CanonicalEntity.EVENT, "timestamp"),
    "event_type": (CanonicalEntity.EVENT, "type"),
    "incident_date": (CanonicalEntity.EVENT, "date"),
    "occurrence": (CanonicalEntity.EVENT, "timestamp"),

    # Asset fields
    "asset_id": (CanonicalEntity.ASSET, "id"),
    "asset_name": (CanonicalEntity.ASSET, "name"),
    "asset_type": (CanonicalEntity.ASSET, "type"),
    "serial_number": (CanonicalEntity.ASSET, "serialNumber"),
    "vin": (CanonicalEntity.ASSET, "vehicleId"),
    "license_plate": (CanonicalEntity.ASSET, "registrationId"),
}


class SchemaInferenceEngine:
    """Infers schema and suggests canonical mappings from sample data."""

    def __init__(self, min_confidence: float = 0.7):
        self.min_confidence = min_confidence

    def infer_schema(self, rows: list[dict[str, Any]]) -> InferredSchema:
        """Infer schema from sample rows.

        Args:
            rows: List of dictionaries representing data rows

        Returns:
            InferredSchema with fields and mapping suggestions
        """
        if not rows:
            return InferredSchema(
                fields=[],
                suggested_mappings=[],
                primary_entity=None,
                record_count=0,
            )

        # Analyze each field
        field_names = rows[0].keys()
        fields = []

        for field_name in field_names:
            field_schema = self._infer_field(field_name, rows)
            fields.append(field_schema)

        # Generate mapping suggestions
        suggestions = self._generate_mappings(fields)

        # Determine primary entity type
        primary_entity = self._determine_primary_entity(suggestions)

        return InferredSchema(
            fields=fields,
            suggested_mappings=suggestions,
            primary_entity=primary_entity,
            record_count=len(rows),
        )

    def _infer_field(
        self, field_name: str, rows: list[dict[str, Any]]
    ) -> FieldSchema:
        """Infer type and characteristics for a single field."""
        values = [row.get(field_name) for row in rows]
        non_null_values = [v for v in values if v is not None and v != ""]

        # Check nullability
        nullable = len(non_null_values) < len(values)

        if not non_null_values:
            return FieldSchema(
                name=field_name,
                inferred_type=FieldType.UNKNOWN,
                nullable=True,
                sample_values=[],
                confidence=0.0,
            )

        # Sample up to 5 values
        sample_values = non_null_values[:5]

        # Detect type
        inferred_type, pattern, confidence = self._detect_type(non_null_values)

        return FieldSchema(
            name=field_name,
            inferred_type=inferred_type,
            nullable=nullable,
            sample_values=sample_values,
            pattern=pattern,
            confidence=confidence,
        )

    def _detect_type(
        self, values: list[Any]
    ) -> tuple[FieldType, str | None, float]:
        """Detect the most likely type for a list of values."""
        if not values:
            return FieldType.UNKNOWN, None, 0.0

        # Convert to strings for pattern matching
        str_values = [str(v) for v in values]

        # Try pattern-based detection
        for field_type, pattern in PATTERNS.items():
            matches = sum(1 for v in str_values if pattern.match(v))
            confidence = matches / len(values)
            if confidence >= 0.8:  # 80% match threshold
                return field_type, pattern.pattern, confidence

        # Fallback to simple type inference
        type_counts = Counter()
        for value in values:
            if isinstance(value, bool):
                type_counts[FieldType.BOOLEAN] += 1
            elif isinstance(value, int):
                type_counts[FieldType.INTEGER] += 1
            elif isinstance(value, float):
                type_counts[FieldType.FLOAT] += 1
            else:
                # Try parsing as number
                try:
                    float(str(value))
                    if "." in str(value):
                        type_counts[FieldType.FLOAT] += 1
                    else:
                        type_counts[FieldType.INTEGER] += 1
                except (ValueError, TypeError):
                    type_counts[FieldType.STRING] += 1

        if type_counts:
            most_common_type, count = type_counts.most_common(1)[0]
            confidence = count / len(values)
            return most_common_type, None, confidence

        return FieldType.STRING, None, 0.5

    def _generate_mappings(
        self, fields: list[FieldSchema]
    ) -> list[MappingSuggestion]:
        """Generate canonical mapping suggestions for fields."""
        suggestions = []

        for field in fields:
            normalized_name = field.name.lower().replace(" ", "_")

            # Direct name match
            if normalized_name in CANONICAL_MAPPINGS:
                entity, property_name = CANONICAL_MAPPINGS[normalized_name]
                suggestions.append(
                    MappingSuggestion(
                        source_field=field.name,
                        canonical_entity=entity,
                        canonical_property=property_name,
                        confidence=0.95,
                        reasoning=f"Direct field name match: '{field.name}'",
                    )
                )
                continue

            # Partial name match
            for canonical_name, (entity, property_name) in CANONICAL_MAPPINGS.items():
                if canonical_name in normalized_name or normalized_name in canonical_name:
                    suggestions.append(
                        MappingSuggestion(
                            source_field=field.name,
                            canonical_entity=entity,
                            canonical_property=property_name,
                            confidence=0.75,
                            reasoning=f"Partial field name match: '{canonical_name}' in '{field.name}'",
                        )
                    )
                    break

            # Type-based heuristics
            if field.inferred_type == FieldType.EMAIL:
                suggestions.append(
                    MappingSuggestion(
                        source_field=field.name,
                        canonical_entity=CanonicalEntity.PERSON,
                        canonical_property="email",
                        confidence=0.85,
                        reasoning="Field contains email addresses",
                    )
                )
            elif field.inferred_type == FieldType.PHONE:
                suggestions.append(
                    MappingSuggestion(
                        source_field=field.name,
                        canonical_entity=CanonicalEntity.PERSON,
                        canonical_property="phone",
                        confidence=0.85,
                        reasoning="Field contains phone numbers",
                    )
                )
            elif field.inferred_type == FieldType.COORDINATES:
                suggestions.append(
                    MappingSuggestion(
                        source_field=field.name,
                        canonical_entity=CanonicalEntity.LOCATION,
                        canonical_property="coordinates",
                        confidence=0.9,
                        reasoning="Field contains geographic coordinates",
                    )
                )

        return suggestions

    def _determine_primary_entity(
        self, suggestions: list[MappingSuggestion]
    ) -> CanonicalEntity | None:
        """Determine the primary entity type based on mappings."""
        if not suggestions:
            return None

        # Count entities weighted by confidence
        entity_scores: dict[CanonicalEntity, float] = {}
        for suggestion in suggestions:
            entity_scores[suggestion.canonical_entity] = (
                entity_scores.get(suggestion.canonical_entity, 0.0)
                + suggestion.confidence
            )

        # Return entity with highest score
        if entity_scores:
            return max(entity_scores.items(), key=lambda x: x[1])[0]

        return None
