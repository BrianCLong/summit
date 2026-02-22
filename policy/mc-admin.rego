package mc.admin

import future.keywords.contains
import future.keywords.if

default allow := false

# Input contract (GraphQL) expected:
# input.operation.name, input.operation.variables, input.actor (oidc), input.tenant, input.context (ip, region, purpose)

# ABAC: only platform-admins can mutate ALL tenant; otherwise must match tenant claim
allow if {
  input.operation.isMutation
  input.actor.role == "platform-admin"
}

allow if {
  input.operation.isMutation
  input.actor.role == "tenant-admin"
  input.tenant == input.actor.tenant
}

# Residency & purpose enforcement example for regulatorExport
deny contains msg if {
  input.operation.name == "regulatorExport"
  not input.context.purpose == "audit"
  msg := "purpose_mismatch"
}

deny contains msg if {
  input.operation.name == "setSloThresholds"
  input.operation.variables.thresholds.graphqlP95 > 500
  msg := "graphql_p95_threshold_too_high"
}

deny contains msg if {
  input.operation.name == "setFeatureFlags"
  input.operation.variables.flags.attestJWS == false
  msg := "attestation_required"
}

# Residency: disallow non-US region for US-only tenants (example)
deny contains msg if {
  input.actor.region == "US"
  input.context.region != "US"
  msg := "residency_violation"
}

# Final decision
decision := {"allow": allow, "deny": deny}
