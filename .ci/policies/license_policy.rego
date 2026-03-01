package license.policy

import future.keywords

# Example: block GPL-3.0 unless waived
warn[msg] {
  some d in input.dependencies
  d.license == "GPL-3.0"
  msg := sprintf("GPL detected: %s", [d.name])
}
