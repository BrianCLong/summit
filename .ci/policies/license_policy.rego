import future.keywords
package license.policy

# Example: block GPL-3.0 unless waived
warn[msg] {
  some d
  d := input.dependencies[_]
  d.license == "GPL-3.0"
  msg := sprintf("GPL detected: %s", [d.name])
}