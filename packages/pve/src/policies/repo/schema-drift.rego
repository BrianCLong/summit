# Schema Drift Policy
#
# Detects breaking changes in schema definitions.

package pve.repo.schema_drift

import future.keywords.in
import future.keywords.if
import future.keywords.contains

default allow := true

# Deny if required fields are removed
deny contains msg if {
    some field in input.removed_fields
    field in input.previous_required
    msg := sprintf("Breaking change: required field '%s' was removed", [field])
}

# Deny if field types are changed incompatibly
deny contains msg if {
    some field, change in input.type_changes
    not compatible_type_change(change.from, change.to)
    msg := sprintf("Breaking change: field '%s' type changed from '%s' to '%s'", [field, change.from, change.to])
}

# Deny if new required fields are added without defaults
deny contains msg if {
    some field in input.new_required
    not field in input.fields_with_defaults
    msg := sprintf("Breaking change: new required field '%s' has no default value", [field])
}

# Allow if no breaking changes
allow if {
    count(deny) == 0
}

# Compatible type changes (widening is allowed)
compatible_type_change("integer", "number") := true
compatible_type_change("int", "float") := true
compatible_type_change("int32", "int64") := true
compatible_type_change(t, t) := true

# Violations for reporting
violations := [{"rule": "schema_drift", "message": msg} | some msg in deny]
