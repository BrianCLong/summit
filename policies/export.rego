package intelgraph.export

import future.keywords.if
import future.keywords.in

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

redactions := result {
  r1 := redactions_from_tags
  r2 := redactions_from_explicit
  result := r1 | r2
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
  rs2 := cond_append(rs, needs_step_up, reason_step_up)
  # Logic split to avoid parser confusion
  step_up_fail := needs_step_up == true
  step_up_fail_2 := has_step_up == false
  step_up_fail_3 := is_enforce == true
  # Check if we failed step-up enforcement
  step_up_missing := step_up_fail == true
  r := cond_append(rs2, step_up_missing, reason_no_step)
}

# allow rules
allow { is_simulate }
allow { is_enforce; not needs_step_up }
allow { is_enforce; needs_step_up; has_step_up }

# Utility: append iff condition true
cond_append(arr, cond, v) := out if {
  cond == true
  out := array.concat(arr, [v])
}

cond_append(arr, cond, _) := arr if {
  cond == false
}
