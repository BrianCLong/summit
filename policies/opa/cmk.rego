import future.keywords.in
import future.keywords.if
package composer.cmk

# Require CMK for artifacts in protected namespaces

needs_cmk if {
  input.tenant.protected == true
}

missing_cmk if {
  needs_cmk
  not input.artifact.kms_key_id
}

allow if {
  not needs_cmk
} else := allow_val if {
  needs_cmk
  not missing_cmk
  allow_val := true
}

# Wrapper decision
package composer.decision_cmk

decision := {
  "policy": "cmk",
  "mode": input.mode,
  "allow": data.composer.cmk.allow,
  "violations": missing,
} if {
  missing := [ {"code": "CMK_REQUIRED", "artifact": input.artifact.digest} | data.composer.cmk.missing_cmk ]
}
