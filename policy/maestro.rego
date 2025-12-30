package maestro.authz

# Require purpose, authority, license for sensitive tasks
allow if {
  input.purpose != ""
  input.authority != ""
  input.license != ""
}

deny contains reason if {
  not allow
  reason := "missing purpose/authority/license"
}
