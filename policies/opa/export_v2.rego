package export.v2

import future.keywords.in

default allow := false

# Simulation mode
simulate := input.simulate

requires_step_up {
  input.bundle.sensitivity in ["Sensitive", "Restricted"]
}

has_webauthn { input.user.webauthn == true }

# DLP
pii_prefix := "pii:"

explicit_pii[field] {
  some i
  field := input.policy.pii[i]
}

should_redact_field(field) {
  startswith(field, pii_prefix)
}

should_redact_field(field) {
  explicit_pii[field]
}

# Redact record
redact_record(obj) := out if {
  out := {f: v | some f; v := obj[f]; not should_redact_field(f)}
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

allow_effective { would_allow }
allow_effective { simulate }

decision := {
  "simulate": simulate,
  "would_allow": would_allow,
  "allow": allow_effective_val,
  "reasons": {r | some r; r := deny_reason[_]},
  "policy_version": input.policy.version,
  "redacted": redact_record(input.record),
} {
    allow_effective_val := val { allow_effective; val := true } else := false
}
