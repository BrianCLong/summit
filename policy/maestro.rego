package maestro.authz

# Require purpose, authority, license for sensitive tasks
allow {
  input.purpose != ""
  input.authority != ""
  input.license != ""
}

deny[reason] {
  not allow
  reason := "missing purpose/authority/license"
}
