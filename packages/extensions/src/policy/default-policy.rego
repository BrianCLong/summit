# Summit Extensions Policy
#
# Default policy for extension permissions and actions.
# This policy can be customized to enforce organizational security requirements.

package summit.extensions

import future.keywords.if
import future.keywords.in

# Default deny
default allow := false

# Allow extensions with no dangerous permissions by default
allow if {
    input.extension
    input.permissions
    no_dangerous_permissions
}

# Dangerous permissions that require explicit approval
dangerous_permissions := {
    "commands:execute",
    "fs:write",
    "network:access"
}

no_dangerous_permissions if {
    not any_dangerous_permission
}

any_dangerous_permission if {
    some perm in input.permissions
    perm in dangerous_permissions
}

# Allow specific extensions with dangerous permissions (whitelist)
allow if {
    input.extension in approved_extensions
}

# Approved extensions (customize this list)
approved_extensions := {
    "analytics-dashboard",
    "entity-enrichment",
    "data-connector"
}

# Allow read-only operations
allow if {
    input.action
    startswith(input.action, "read")
}

# Allow entity operations for extensions with appropriate permissions
allow if {
    input.action in ["entities:create", "entities:update"]
    "entities:write" in input.permissions
}

allow if {
    input.action in ["relationships:create"]
    "relationships:write" in input.permissions
}

# Deny network access unless explicitly granted
deny_reason := "Network access requires explicit approval" if {
    input.action == "network:request"
    not "network:access" in input.permissions
}

# Deny file system writes unless explicitly granted
deny_reason := "File system writes require explicit approval" if {
    input.action == "fs:write"
    not "fs:write" in input.permissions
}

# Deny command execution unless explicitly granted
deny_reason := "Command execution requires explicit approval" if {
    input.action == "commands:execute"
    not "commands:execute" in input.permissions
}

# Rate limiting for API calls (per extension)
rate_limit_exceeded if {
    # This would be implemented with OPA's built-in time functions
    # and external data for tracking request counts
    false  # Placeholder
}

deny_reason := "Rate limit exceeded" if {
    rate_limit_exceeded
}

# Log all permission checks for audit
audit_log := {
    "timestamp": time.now_ns(),
    "extension": input.extension,
    "action": input.action,
    "permissions": input.permissions,
    "allowed": allow,
    "reason": deny_reason
}
