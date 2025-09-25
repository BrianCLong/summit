package intelgraph.abac

import future.keywords.if
import future.keywords.in

# Default deny
default allow := false

# Allow if user has valid tenant and meets purpose requirements
allow if {
  input.user.tenant == input.resource.tenant
  not violates_purpose
  not violates_residency
}

# Check purpose-based access
violates_purpose if {
  input.resource.purpose == "threat-intel"
  not "purpose:threat-intel" in input.user.scopes
}

violates_purpose if {
  input.resource.purpose == "investigation"
  not "purpose:investigation" in input.user.scopes
}

# US-only residency enforcement for Topicality
violates_residency if {
  input.resource.region != "US"
}

violates_residency if {
  input.user.residency != "US"
}

# PII field redaction rules
pii_redact[field] if {
  input.resource.pii_flags[field] == true
  not "scope:pii" in input.user.scopes
}

# Retention policy enforcement
retention_expired if {
  input.resource.retention_tier == "short-30d"
  time.now_ns() - input.resource.created_at > (30 * 24 * 60 * 60 * 1000000000)
}

retention_expired if {
  input.resource.retention_tier == "standard-365d"
  time.now_ns() - input.resource.created_at > (365 * 24 * 60 * 60 * 1000000000)
}

# Block access to expired data
deny if {
  retention_expired
}

# GraphQL operation-specific rules
graphql_allowed if {
  input.operation_type == "query"
  allow
}

graphql_allowed if {
  input.operation_type == "mutation"
  allow
  "role:admin" in input.user.roles
}

# API rate limiting hints (for external enforcement)
rate_limit_tier := "standard" if {
  not "role:premium" in input.user.roles
}

rate_limit_tier := "premium" if {
  "role:premium" in input.user.roles
}