package intelgraph.policy.contracting

import future.keywords.contains

# Contracting compliance gate for regulated export, assessment, incident,
# connector execution, and coalition egress workflows.

default allow = false

allowed_scopes := {
  "US-ONLY",
  "COALITION",
  "PARTNER",
  "CUI",
  "NATO-RESTRICTED",
}

requires_scope_token if input.action in {
  "releasability_pack",
  "osint_egress",
  "incident_packet",
  "connector_execute",
}

requires_egress if input.action in {
  "releasability_pack",
  "osint_egress",
  "connector_execute",
}

requires_attestation if input.action in {
  "releasability_pack",
  "connector_execute",
}

requires_sbom if input.action == "connector_execute"

requires_assessment_evidence if input.action == "assessment_evidence"

requires_incident_fields if input.action == "incident_packet"

deny contains "missing_action" if not input.action

deny contains "missing_current_time" if requires_scope_token
  not input.now

deny contains "invalid_scope_classification" if requires_scope_token
  not valid_scope_classification

deny contains "invalid_scope_token" if requires_scope_token
  not token_valid

deny contains "missing_egress_budget" if requires_egress
  not input.egress

deny contains "egress_budget_exceeded" if requires_egress
  input.egress.bytes > input.egress.budget_bytes

deny contains "entity_budget_exceeded" if requires_egress
  input.egress.entities > input.egress.entity_budget

deny contains "missing_attestation" if requires_attestation
  not attestation_ok

deny contains "sbom_or_license_invalid" if requires_sbom
  not sbom_ok

deny contains "incident_reporting_window_exceeded" if requires_incident_fields
  input.incident.reporting_window_hours > 72

deny contains "incident_preservation_incomplete" if requires_incident_fields
  input.incident.triggered
  not input.incident.preservation_complete

deny contains "missing_control_evidence" if requires_assessment_evidence
  not evidence_ok

deny contains "missing_control_ids" if requires_assessment_evidence
  count(input.evidence.control_ids) == 0

allow if count(deny) == 0

valid_scope_classification if input.scope.classification in allowed_scopes

attestation_ok if input.attestation.required
  input.attestation.present

attestation_ok if not input.attestation.required

sbom_ok if input.sbom.required
  input.sbom.present
  input.sbom.licenses_ok

sbom_ok if not input.sbom.required

evidence_ok if input.evidence.sufficiency

token_valid if
  input.scope.token.tenant != ""
  input.scope.token.purpose != ""
  input.scope.token.expiration >= input.now
