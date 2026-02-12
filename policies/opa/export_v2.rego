package export.v2

import future.keywords.if
import future.keywords.in
import future.keywords.contains

default allow := false

# Simulation mode: when true, decision.allow_effective may be true even if would_allow is false
simulate := input.simulate

# Sensitivity tiers requiring step-up auth
requires_step_up {
  input.bundle.sensitivity == "Sensitive" or input.bundle.sensitivity == "Restricted"
}

has_webauthn := input.user.webauthn == true

# DLP: fields to redact (pii prefixes and explicit list)
pii_prefix := "pii:"

explicit_pii[field] {
  field := input.policy.pii[_]
}

should_redact_field(field) {
  startswith(field, pii_prefix)
} else {
  explicit_pii[field]
}

# Build a redacted copy of the record by removing/masking pii fields
redact_record(obj) = out {
  out := object.remove(obj, [f | f := keys(obj)[_]; should_redact_field(f)])
}

# Deny reasons
deny_reason["step_up_required"] {
  requires_step_up
  not has_webauthn
}

deny_reason[reason] {
  input.export.options.disallow_unmasked
  some f
  should_redact_field(f)
  input.record[f]
  reason := sprintf("unmasked_field:%s", [f])
}

would_allow {
  not deny_reason[_]
}

allow {
  would_allow
}

decision := {
  "simulate": simulate,
  "would_allow": would_allow,
  "allow": allow_effective,
  "reasons": {r | r := deny_reason[_]},
  "policy_version": input.policy.version,
  "redacted": redact_record(input.record),
} {
  allow_effective := (would_allow or simulate)
}

