package intelgraph.export

# Policy version for audit
policy_version := "2.0.0"

# === Inputs (contract) ===
# input = {
#   "env": {"step_up_enabled": true},
#   "user": {"id": "u123", "scopes": ["export"], "webauthn_verified": false},
#   "tenant": "t1",
#   "purpose": "investigation",
#   "bundle": {
#     "sensitivity": "Sensitive",   # Public | Sensitive | Restricted
#     "labels": ["case:42"],
#     "fields": ["name", "email", "ssn", "notes"],
#     "explicit_dlp_fields": ["notes"]
#   },
#   "simulate": true
# }

# === Defaults ===
default allow := false

# Result document returned to caller
result := {
  "allow": allow,
  "reasons": reasons,
  "redactions": redactions,
  "step_up_required": step_up_required,
  "policy_version": policy_version,
  "mode": mode
}

mode := cond ? "simulate" : "enforce" { cond := input.simulate }
mode := "enforce" { not input.simulate }

# Step-up is required for Sensitive/Restricted when enabled and not verified yet.
step_up_required {
  input.env.step_up_enabled
  bundle_sensitivity in {"Sensitive", "Restricted"}
  not input.user.webauthn_verified
}

bundle_sensitivity := s { s := input.bundle.sensitivity }

# DLP — redact any field labeled pii:* or explicitly requested by caller
redactions := {f | f := input.bundle.fields[_]; needs_redaction(f)} union {f | f := input.bundle.explicit_dlp_fields[_]}

needs_redaction(f) {
  some k
  field_labels[f][k]
  startswith(k, "pii:")
}

# Field → labels map (optional; can be provided via data or input)
field_labels := coalesce_labels
coalesce_labels := input.field_labels { input.field_labels }
coalesce_labels := data.field_labels { not input.field_labels }
coalesce_labels := {} { not input.field_labels; not data.field_labels }

# Reasons collected for audit and UX
reasons[r] {
  not user_has_scope("export")
  r := "denied.missing_scope_export"
}
reasons[r] {
  step_up_required
  r := "step_up.required"
}
reasons[r] {
  count(redactions) > 0
  r := sprintf("dlp.redactions_applied:%v", [count(redactions)])
}

# Allow when: scope present AND (no step-up required OR already verified)
allow {
  user_has_scope("export")
  not step_up_required
}

# In simulate mode we **do not** change allow; callers decide enforcement externally.

user_has_scope(s) {
  input.user.scopes[_] == s
}

# Utility: startswith for Rego < 1.0 compat
startswith(s, prefix) {
  count(prefix) <= count(s)
  substring(s, 0, count(prefix)) == prefix
}
