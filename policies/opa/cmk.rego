package composer.cmk

import future.keywords.in

# Require CMK for artifacts in protected namespaces

needs_cmk {
  input.tenant.protected == true
}

missing_cmk {
  needs_cmk
  not input.artifact.kms_key_id
}

allow {
  not needs_cmk
} else = allow {
  needs_cmk
  not missing_cmk
}

# Wrapper decision
package composer.decision_cmk

decision := {
  "policy": "cmk",
  "mode": input.mode,
  "allow": data.composer.cmk.allow,
  "violations": array.concat([], (missing)),
}
{
  missing := [ {"code": "CMK_REQUIRED", "artifact": input.artifact.digest} | data.composer.cmk.missing_cmk ]
}

