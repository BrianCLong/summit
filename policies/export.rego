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
needs_step_up { sens == "sensitive" }
needs_step_up { sens == "restricted" }

has_step_up := input.auth.webauthn_verified == true

# Collect DLP redactions from pii:* tags on fields
redactions_from_tags[entry] {
  f := input.resource.fields[_]
  t := f.tags[_]
  startswith(t, "pii:")
  entry := {"path": f.path, "reason": t}
}

# Merge explicit masks
redactions_from_explicit[entry] {
  p := input.resource.explicit_dlp_mask_paths[_]
  entry := {"path": p, "reason": "explicit"}
}

redactions = r {
  r := redactions_from_tags | redactions_from_explicit
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
    "required": needs_step_up_val,
    "satisfied": has_step_up
  },
  "reasons": reasons
} {
  needs_step_up_val := is_needs_step_up
}

is_needs_step_up {
  needs_step_up
}
else = false

reasons = r {
  base := []
  cond1 := is_needs_step_up
  rs := cond_append(base, cond1, reason_step_up)
  cond2 := should_show_no_step_reason
  r := cond_append(rs, cond2, reason_no_step)
}

should_show_no_step_reason {
  needs_step_up
  not has_step_up
  is_enforce
}

# allow rules
allow { is_simulate }
allow { is_enforce; not needs_step_up }
allow { is_enforce; needs_step_up; has_step_up }

# Utility: append iff condition true
cond_append(arr, cond, v) = out { cond; out := array.concat(arr, [v]) }
cond_append(arr, cond, _) = arr { not cond }
