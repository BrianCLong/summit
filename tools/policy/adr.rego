import future.keywords
package repo.adr
default allow = true
deny[msg] {
  some i
  rule := input.rules[i]
  not eval(rule.rego)  # evaluated by conftest with data context from repo scan
  msg := sprintf("ADR violated by %v", [rule.id])
}