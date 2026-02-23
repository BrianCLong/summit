import future.keywords.in
package composer.cmk


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
}

allow {
  needs_cmk
  not missing_cmk
}
