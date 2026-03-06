import future.keywords.in
import future.keywords.if
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

is_simulate if { input.mode == "simulate" }
is_enforce  if { input.mode == "enforce" }

sens := lower(input.resource.sensitivity)
needs_step_up if { sens == "sensitive" or sens == "restricted" }
has_step_up if { input.auth.webauthn_verified == true }

# Collect DLP redactions from pii:* tags on fields
redactions_from_tags[entry] if {
  some f in input.resource.fields
  some t in f.tags
  startswith(t, "pii:")
  entry := {"path": f.path, "reason": t}
}

# Merge explicit masks
redactions_from_explicit[entry] if {
  some p in input.resource.explicit_dlp_mask_paths
  entry := {"path": p, "reason": "explicit"}
}

redactions := r if {
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
    "required": needs_step_up,
    "satisfied": has_step_up
  },
  "reasons": reasons
}

reasons := r if {
  rs0 := []
  rs1 := cond_append(rs0, needs_step_up, reason_step_up)
  rs2 := cond_append(rs1, needs_step_up and not has_step_up and is_enforce, reason_no_step)
  r := rs2
}

# allow rules
allow if { is_simulate }
allow if { is_enforce; not needs_step_up }
allow if { is_enforce; needs_step_up; has_step_up }

# Utility: append iff condition true
cond_append(arr, cond, v) := out if { cond; out := array.concat(arr, [v]) }
else := arr
