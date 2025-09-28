package goldenpath.secrets

allow if {
  not violation
}

violation if {
  finding := input.secrets.findings[_]
  finding.status != "false_positive"
}
