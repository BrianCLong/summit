import future.keywords
package policy.flags

deny[msg] {
  some k
  k := input.code_flags[_]
  not input.catalog[k]
  msg := sprintf("flag %q missing from catalog.yaml", [k])
}

deny[msg] {
  f := input.catalog[_]
  f.kill_switch
  input.env == "prod"
  not input.change.approved_by_security
  msg := sprintf("prod enable of kill_switch flag %q requires security approval", [f.key])
}
