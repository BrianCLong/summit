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

default allow = false
allow {
  not needs_cmk
}
allow {
  needs_cmk
  not missing_cmk
}
