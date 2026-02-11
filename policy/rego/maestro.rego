import future.keywords.in
package maestro.policy

import future.keywords.if
import future.keywords.contains

# deny if path outside allowlist for write
violation contains reason if {
  input.action == "write"
  not startswith(input.path, "server/")
  reason := sprintf("Writes to %s require human review", [input.path])
}

# model budget cap per PR
violation contains reason if {
  input.kind == "model_call"
  sum(input.spends) > input.budget
  reason := sprintf("Budget exceeded: spent $%.2f > $%.2f", [sum(input.spends), input.budget])
}
