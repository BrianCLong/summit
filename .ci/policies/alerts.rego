import future.keywords
package policy.alerts

deny[msg] {
  a := input.catalog[_]
  not a.runbook
  msg := sprintf("alert %q missing runbook", [a.id])
}

deny[msg] {
  a := input.catalog[_]
  not a.owner
  msg := sprintf("alert %q missing owner", [a.id])
}

deny[msg] {
  a := input.catalog[_]
  not a.slo_ref
  msg := sprintf("alert %q missing SLO reference", [a.id])
}

deny[msg] {
  a := input.catalog[_]
  not a.severity
  msg := sprintf("alert %q missing severity", [a.id])
}
