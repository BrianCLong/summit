import future.keywords
package export

# Decision entrypoint
# Returns an object: {"effect": "allow"|"deny"|"step_up"|"allow_with_redactions", "redact_fields": [..], "reasons": [..], "simulated": bool, "note": string}

default decision := {"effect": "deny", "redact_fields": [], "reasons": ["no_rules_evaluated"], "simulated": false}

export_allowed_roles := { r | r := "admin" } ∪ { r | r := "exporter" }
is_sensitive := input.bundle.sensitivity == "Sensitive" or input.bundle.sensitivity == "Restricted"

has_export_perm {
  some p
  p := input.user.permissions[_]
  p == "export"
}

in_allowed_role {
  some r
  r := input.user.roles[_]
  r == export_allowed_roles[_]
}

is_pii_field[f] {
  f := input.bundle.fields[_]
  some l
  l := f.labels[_]
  startswith(l, "pii:")
}

is_explicit_mask[f] {
  f := input.bundle.fields[_]
  some m
  m := input.options.dlp_mask_fields[_]
  m == f.name
}

redact_fields := { f.name | f := input.bundle.fields[_]; is_pii_field[f] }
explicit_masks := { f.name | f := input.bundle.fields[_]; is_explicit_mask[f] }
all_masks := redact_fields ∪ explicit_masks

reason["not_authorized"] { not has_export_perm }
reason["role_not_allowed"] { not in_allowed_role }
reason["step_up_required"] { is_sensitive; not input.webauthn_verified }

base_effect := "allow" { has_export_perm; in_allowed_role; not is_sensitive }
base_effect := "step_up" { has_export_perm; in_allowed_role; is_sensitive; not input.webauthn_verified }
base_effect := "allow" { has_export_perm; in_allowed_role; is_sensitive; input.webauthn_verified }

must_deny {
  some r
  r := reason[_]
  r != "step_up_required"
}

result := {
  "effect": "deny",
  "redact_fields": [],
  "reasons": [ r | r := reason[_] ],
  "simulated": false,
  "note": "Denied by policy"
} { must_deny }

result := {
  "effect": "step_up",
  "redact_fields": [],
  "reasons": ["step_up_required"],
  "simulated": false,
  "note": "Sensitive export requires WebAuthn step‑up"
} { not must_deny; base_effect == "step_up" }

result := allow_obj {
  not must_deny
  base_effect == "allow"
  allow_obj := {
    "effect": eff,
    "redact_fields": masks,
    "reasons": ["dlp_redaction"] { count(masks) > 0 },
    "simulated": false,
    "note": note
  }
  masks := array.concat([], sort(all_masks))
  eff := "allow_with_redactions" { count(masks) > 0 }
  eff := "allow" { count(masks) == 0 }
  note := sprintf("Allowed. Redactions: %v", [masks])
}

decision := sim_obj {
  input.simulate
  sim_obj := result with sim_obj.simulated as true
}

decision := result { not input.simulate }
