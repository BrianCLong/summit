import future.keywords.in
import future.keywords.if
package export.v2

default allow := false

# Simulation mode: when true, decision.allow_effective may be true even if would_allow is false
simulate := input.simulate

# Sensitivity tiers requiring step-up auth
requires_step_up if {
  input.bundle.sensitivity in ["Sensitive", "Restricted"]
}

has_webauthn if { input.user.webauthn == true }

# DLP: fields to redact (pii prefixes and explicit list)
pii_prefix := "pii:"

explicit_pii[field] if {
  some field in input.policy.pii
}

should_redact_field(field) if {
  startswith(field, pii_prefix)
} else if {
  explicit_pii[field]
}

# Build a redacted copy of the record by removing/masking pii fields
redact_record(obj) := out if {
  out := object.remove(obj, [f | some f in object.keys(obj); should_redact_field(f)])
}

# Deny reasons
deny_reason["step_up_required"] if {
  requires_step_up
  not has_webauthn
}

deny_reason[reason] if {
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
  "reasons": {r | some r in deny_reason},
  "policy_version": input.policy.version,
  "redacted": redact_record(input.record),
} if {
  allow_effective := (would_allow or simulate)
}
