package export

import future.keywords.if
import future.keywords.contains

# Decision entrypoint
# Returns an object: {"effect": "allow"|"deny"|"step_up"|"allow_with_redactions", "redact_fields": [..], "reasons": [..], "simulated": bool, "note": string}

default decision := {"effect": "deny", "redact_fields": [], "reasons": ["no_rules_evaluated"], "simulated": false}

export_allowed_roles := { "admin", "exporter" }

is_sensitive if { input.bundle.sensitivity == "Sensitive" }
is_sensitive if { input.bundle.sensitivity == "Restricted" }

has_export_perm if {
  some p in input.user.permissions
  p == "export"
}

in_allowed_role if {
  some r in input.user.roles
  r in export_allowed_roles
}

is_pii_field contains f if {
  some f in input.bundle.fields
  some l in f.labels
  startswith(l, "pii:")
}

is_explicit_mask contains f if {
  some f in input.bundle.fields
  some m in input.options.dlp_mask_fields
  m == f.name
}

redact_fields := { f.name | f := input.bundle.fields[_]; is_pii_field[f] }
explicit_masks := { f.name | f := input.bundle.fields[_]; is_explicit_mask[f] }
all_masks := redact_fields | explicit_masks

reason contains "not_authorized" if { not has_export_perm }
reason contains "role_not_allowed" if { not in_allowed_role }
reason contains "step_up_required" if { is_sensitive; not input.webauthn_verified }

base_effect := "allow" if { has_export_perm; in_allowed_role; not is_sensitive }
base_effect := "step_up" if { has_export_perm; in_allowed_role; is_sensitive; not input.webauthn_verified }
base_effect := "allow" if { has_export_perm; in_allowed_role; is_sensitive; input.webauthn_verified }

must_deny if {
  some r in reason
  r != "step_up_required"
}

result := {
  "effect": "deny",
  "redact_fields": [],
  "reasons": [ r | r := reason[_] ],
  "simulated": false,
  "note": "Denied by policy"
} if { must_deny }

result := {
  "effect": "step_up",
  "redact_fields": [],
  "reasons": ["step_up_required"],
  "simulated": false,
  "note": "Sensitive export requires WebAuthn step-up"
} if { not must_deny; base_effect == "step_up" }

result := allow_obj if {
  not must_deny
  base_effect == "allow"

  masks := array.concat([], sort(all_masks))

  eff := get_effect(masks)
  rs := get_reasons(masks)
  note := sprintf("Allowed. Redactions: %v", [masks])

  allow_obj := {
    "effect": eff,
    "redact_fields": masks,
    "reasons": rs,
    "simulated": false,
    "note": note
  }
}

get_effect(masks) := "allow_with_redactions" if { count(masks) > 0 }
get_effect(masks) := "allow" if { count(masks) == 0 }

get_reasons(masks) := ["dlp_redaction"] if { count(masks) > 0 }
get_reasons(masks) := [] if { count(masks) == 0 }

decision := sim_obj if {
  input.simulate
  sim_obj := object.union(result, {"simulated": true})
}

decision := result if { not input.simulate }
