# API Surface Policy
#
# Validates API changes for backwards compatibility.

package pve.schema.api_surface

import future.keywords.in
import future.keywords.if
import future.keywords.contains

default allow := true

# Breaking change types
breaking_change_types := {
    "endpoint_removed",
    "required_param_added",
    "response_field_removed",
    "type_changed",
    "method_changed"
}

# Check for removed endpoints
deny contains msg if {
    some endpoint in input.removed_endpoints
    msg := sprintf("Breaking change: endpoint '%s' was removed", [endpoint])
}

# Check for new required parameters
deny contains msg if {
    some endpoint, params in input.new_required_params
    some param in params
    msg := sprintf("Breaking change: new required parameter '%s' added to '%s'", [param, endpoint])
}

# Check for removed response fields
deny contains msg if {
    some endpoint, fields in input.removed_response_fields
    some field in fields
    msg := sprintf("Breaking change: response field '%s' removed from '%s'", [field, endpoint])
}

# Check for changed types
deny contains msg if {
    some change in input.type_changes
    msg := sprintf("Breaking change: type of '%s' in '%s' changed from '%s' to '%s'",
        [change.field, change.endpoint, change.from, change.to])
}

# Check for changed HTTP methods
deny contains msg if {
    some change in input.method_changes
    msg := sprintf("Breaking change: HTTP method for '%s' changed from '%s' to '%s'",
        [change.endpoint, change.from, change.to])
}

# Warn about deprecated endpoints still in use
warnings contains msg if {
    some endpoint in input.deprecated_endpoints
    endpoint.still_used == true
    msg := sprintf("Deprecated endpoint '%s' is still being used", [endpoint.path])
}

# Warn about missing API versioning
warnings contains msg if {
    not input.versioning_enabled
    msg := "API versioning is not enabled - consider implementing versioning"
}

# Info about non-breaking additions
info contains msg if {
    some endpoint in input.new_endpoints
    msg := sprintf("New endpoint added: '%s'", [endpoint])
}

info contains msg if {
    some endpoint, fields in input.new_optional_params
    some field in fields
    msg := sprintf("New optional parameter '%s' added to '%s'", [field, endpoint])
}

allow if {
    count(deny) == 0
}

violations := [{"rule": "api_surface", "message": msg, "severity": "error"} | some msg in deny]
warnings_list := [{"rule": "api_surface", "message": msg, "severity": "warning"} | some msg in warnings]
additions := [{"rule": "api_surface", "message": msg, "severity": "info"} | some msg in info]
