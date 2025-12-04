# Metadata Invariants Policy
#
# Enforces metadata schema and invariants across entities.

package pve.repo.metadata_invariants

import future.keywords.in
import future.keywords.if
import future.keywords.contains

default allow := true

# Core required fields for all entities
core_required := {"id", "type", "createdAt", "updatedAt"}

# Entity-specific required fields
entity_required := {
    "person": {"name"},
    "organization": {"name"},
    "location": {"coordinates"},
    "event": {"name", "timestamp"},
    "document": {"title", "source"}
}

# Classification levels (in order of increasing sensitivity)
classification_levels := ["UNCLASSIFIED", "CUI", "CONFIDENTIAL", "SECRET", "TOP_SECRET"]

# Check core required fields
deny contains msg if {
    some field in core_required
    not field in object.keys(input.metadata)
    msg := sprintf("Missing core required field: '%s'", [field])
}

# Check entity-specific required fields
deny contains msg if {
    entity_type := lower(input.entityType)
    required := entity_required[entity_type]
    some field in required
    not field in object.keys(input.metadata)
    msg := sprintf("Missing required field for %s: '%s'", [entity_type, field])
}

# Validate ID format (UUID)
deny contains msg if {
    id := input.metadata.id
    not regex.match(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`, lower(id))
    msg := sprintf("Invalid ID format: '%s' (expected UUID)", [id])
}

# Validate timestamps are ISO 8601
deny contains msg if {
    some field in {"createdAt", "updatedAt"}
    ts := input.metadata[field]
    not valid_timestamp(ts)
    msg := sprintf("Invalid timestamp format for '%s': '%s'", [field, ts])
}

# Validate classification level
deny contains msg if {
    classification := input.metadata.classification
    classification != null
    not classification in classification_levels
    msg := sprintf("Invalid classification level: '%s'", [classification])
}

# Validate coordinates for location entities
deny contains msg if {
    lower(input.entityType) == "location"
    coords := input.metadata.coordinates
    coords != null
    not valid_coordinates(coords)
    msg := "Invalid coordinates: latitude must be -90 to 90, longitude -180 to 180"
}

# Check that updatedAt >= createdAt
deny contains msg if {
    created := input.metadata.createdAt
    updated := input.metadata.updatedAt
    created != null
    updated != null
    time.parse_rfc3339_ns(updated) < time.parse_rfc3339_ns(created)
    msg := "updatedAt cannot be before createdAt"
}

# Helper: validate timestamp format
valid_timestamp(ts) if {
    regex.match(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`, ts)
}

# Helper: validate coordinates
valid_coordinates(coords) if {
    coords.latitude >= -90
    coords.latitude <= 90
    coords.longitude >= -180
    coords.longitude <= 180
}

allow if {
    count(deny) == 0
}

violations := [{"rule": "metadata_invariants", "message": msg} | some msg in deny]
