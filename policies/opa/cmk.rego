package composer.cmk

import future.keywords.if
import future.keywords.in

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

# Wrapper decision (moved into same package or just using local references)
decision := {
  "policy": "cmk",
  "mode": input.mode,
  "allow": allow,
  "violations": violations,
}

violations := [ {"code": "CMK_REQUIRED", "artifact": input.artifact.digest} | missing_cmk ]
