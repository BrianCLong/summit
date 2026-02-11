package intelgraph.export

# Export policy for IntelGraph GA Core — simulate/enforce, DLP redactions, WebAuthn step-up.
# Decision object intentionally explicit for audit & UX payloads.

default allow := false

# --- Inputs (expected) -------------------------------------------------------
# input.mode:        "simulate" | "enforce"
# input.action:      "export"
# input.auth:        { webauthn_verified: bool, actor: string }
# input.resource:    {
#   sensitivity: "Public" | "Internal" | "Sensitive" | "Restricted",
#   fields: [ { path: string, tags: [string] } ],        # tags like "pii:ssn", "pii:email"
#   explicit_dlp_mask_paths: [string]                    # extra masks by absolute path
# }

# --- Helpers -----------------------------------------------------------------

is_simulate := input.mode == "simulate"
is_enforce  := input.mode == "enforce"

sens := lower(input.resource.sensitivity)
needs_step_up := sens == "sensitive" or sens == "restricted"
has_step_up := input.auth.webauthn_verified == true

# Collect DLP redactions from pii:* tags on fields
redactions_from_tags[entry] {
  f := input.resource.fields[_]
  some t
  t := f.tags[_]
  startswith(t, "pii:")
  entry := {"path": f.path, "reason": t}
}

# Merge explicit masks
redactions_from_explicit[entry] {
  p := input.resource.explicit_dlp_mask_paths[_]
  entry := {"path": p, "reason": "explicit"}
}

redactions := r {
  r := redactions_from_tags
  r2 := redactions_from_explicit
  r := r | r2
}

# Reasons (human-readable)
reason_step_up := sprintf("step-up required for sensitivity=%v", [input.resource.sensitivity])
reason_no_step := "missing WebAuthn step-up"

# Decision payload exposed for API handlers
decision := {
  "mode": input.mode,
  "allow": allow,
  "redactions": redactions,
  "step_up": {
    "required": needs_step_up,
    "satisfied": has_step_up
  },
  "reasons": reasons
}

reasons := r {
  base := []
  rs := base
  rs := cond_append(rs, needs_step_up, reason_step_up)
  rs := cond_append(rs, needs_step_up and not has_step_up and is_enforce, reason_no_step)
  r := rs
}

# allow rules
allow { is_simulate }
allow { is_enforce; not needs_step_up }
allow { is_enforce; needs_step_up; has_step_up }

# Utility: append iff condition true
cond_append(arr, cond, v) = out { cond; out := array.concat(arr, [v]) }
cond_append(arr, cond, _) = arr { not cond }

