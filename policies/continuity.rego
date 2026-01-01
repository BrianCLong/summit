package continuity

default allow_change = false

# A change is allowed only if it stays within purpose scope, keeps safety controls enabled,
# and is explicitly authorized with a current waiver or governance approval.
allow_change {
  purpose_within_scope
  safety_controls_enabled
  authorized_change
}

purpose_within_scope {
  not input.request.non_purpose
  not input.request.red_line
}

safety_controls_enabled {
  input.runtime.provenance_enabled == true
  input.runtime.policy_enforcement == "strict"
  input.runtime.audit_sink == "immutable"
}

authorized_change {
  input.request.approval.type == "governance"
  input.request.approval.quorum_met == true
  input.request.approval.ticket_id != ""
  waiver_ok
}

# Waivers must be time-bound and tied to a custodian.
waiver_ok {
  not input.request.waiver
} else {
  input.request.waiver.expiry > input.now
  input.request.waiver.owner != ""
  input.request.waiver.scope_subset == true
}

# Capture friction: block changes motivated solely by cost/latency if they weaken evidence.
deny_capture_risk[msg] {
  input.request.motivation == "cost_speed_only"
  msg := "change rejected: cost/speed cannot lower evidence or provenance"
}

deny_capture_risk[msg] {
  input.request.partner_override == true
  msg := "change rejected: external influence detected"
}

# Drift detection: if semantic drift exceeds threshold, require explicit justification.
deny_drift[msg] {
  input.metrics.semantic_delta >= 0.03
  not input.request.justification
  msg := "change rejected: semantic drift exceeds threshold without justification"
}
