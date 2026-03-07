package composer.cmk

import rego.v1

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
}

allow if {
  needs_cmk
  not missing_cmk
}

# Wrapper decision
decision := {
  "policy": "cmk",
  "mode": input.mode,
  "allow": allow,
  "violations": violations,
}

violations := [ {"code": "CMK_REQUIRED", "artifact": input.artifact.digest} ] if {
  missing_cmk
} else := []
