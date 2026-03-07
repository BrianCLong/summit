package export.v2

import rego.v1

default allow := false

# Simulation mode: when true, decision.allow_effective may be true even if would_allow is false
simulate := input.simulate

# Sensitivity tiers requiring step-up auth
requires_step_up if {
  input.bundle.sensitivity == "Sensitive"
}

requires_step_up if {
  input.bundle.sensitivity == "Restricted"
}

has_webauthn := input.user.webauthn == true

# DLP: fields to redact (pii prefixes and explicit list)
pii_prefix := "pii:"

explicit_pii contains field if {
  field := input.policy.pii[_]
}

should_redact_field(field) if {
  startswith(field, pii_prefix)
}

should_redact_field(field) if {
  explicit_pii[field]
}

# Build a redacted copy of the record by removing/masking pii fields
redact_record(obj) := out if {
  out := object.remove(obj, [f | some f in object.keys(obj); should_redact_field(f)])
}

# Deny reasons
deny_reason contains "step_up_required" if {
  requires_step_up
  not has_webauthn
}

deny_reason contains reason if {
  input.export.options.disallow_unmasked
  some f in object.keys(input.record)
  should_redact_field(f)
  reason := sprintf("unmasked_field:%s", [f])
}

would_allow if {
  count(deny_reason) == 0
}

allow if {
  would_allow
}

decision := {
  "simulate": simulate,
  "would_allow": would_allow,
  "allow": allow_effective,
  "reasons": deny_reason,
  "policy_version": input.policy.version,
  "redacted": redact_record(input.record),
}

allow_effective := true if { would_allow } else := true if { simulate } else := false
