package composer.cmk

import future.keywords

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
