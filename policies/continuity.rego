package summit.governance.continuity

import rego.v1

# Continuity guardrail policy for purpose lock, succession safety, and drift/capture controls.
# Input contract (minimal):
# {
#   "request": {
#     "non_purpose": false,
#     "red_line": false,
#     "approval": {"type": "governance", "quorum_met": true, "ticket_id": "..."},
#     "waiver": {"expiry": 1730000000, "owner": "...", "scope_subset": true},
#     "motivation": "cost_speed_only",
#     "partner_override": false,
#     "justification": "..."
#   },
#   "runtime": {"provenance_enabled": true, "policy_enforcement": "strict", "audit_sink": "immutable"},
#   "metrics": {"semantic_delta": 0.02},
#   "now": 1730000000
# }

default allow := false

allow if {
  purpose_within_scope
  safety_controls_enabled
  authorized_change
  not deny[_]
}

purpose_within_scope if {
  not input.request.non_purpose
  not input.request.red_line
}

safety_controls_enabled if {
  input.runtime.provenance_enabled == true
  input.runtime.policy_enforcement == "strict"
  input.runtime.audit_sink == "immutable"
}

authorized_change if {
  approval := input.request.approval
  approval.type == "governance"
  approval.quorum_met == true
  approval.ticket_id != ""
  waiver_ok
}

waiver_ok if {
  not input.request.waiver
}

waiver_ok if {
  waiver := input.request.waiver
  waiver.expiry > input.now
  waiver.owner != ""
  waiver.scope_subset == true
}

# Explicit denials with actionable messages.

deny[reason] if {
  input.request.non_purpose == true
  reason := "change rejected: non-purpose request"
}

deny[reason] if {
  input.request.red_line == true
  reason := "change rejected: red-line violation"
}

deny[reason] if {
  not input.runtime.provenance_enabled
  reason := "change rejected: provenance must remain enabled"
}

deny[reason] if {
  input.runtime.policy_enforcement != "strict"
  reason := "change rejected: policy enforcement must remain strict"
}

deny[reason] if {
  input.runtime.audit_sink != "immutable"
  reason := "change rejected: audit sink must remain immutable"
}

deny[reason] if {
  not input.request.approval
  reason := "change rejected: missing governance approval"
}

deny[reason] if {
  input.request.approval.type != "governance"
  reason := "change rejected: approval must be governance"
}

deny[reason] if {
  input.request.approval.quorum_met != true
  reason := "change rejected: governance quorum not met"
}

deny[reason] if {
  input.request.approval.ticket_id == ""
  reason := "change rejected: approval ticket ID required"
}

deny[reason] if {
  input.request.waiver
  not waiver_ok
  reason := "change rejected: waiver invalid or expired"
}

# Capture friction: block changes motivated solely by cost/latency if they weaken evidence.

deny[reason] if {
  input.request.motivation == "cost_speed_only"
  reason := "change rejected: cost/speed cannot lower evidence or provenance"
}

deny[reason] if {
  input.request.partner_override == true
  reason := "change rejected: external influence detected"
}

# Drift detection: if semantic drift exceeds threshold, require explicit justification.

deny[reason] if {
  input.metrics.semantic_delta >= 0.03
  not input.request.justification
  reason := "change rejected: semantic drift exceeds threshold without justification"
}
