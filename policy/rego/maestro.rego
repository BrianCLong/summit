package maestro.policy

# deny if path outside allowlist for write
violation[reason] {
  input.action == "write"
  not startswith(input.path, "server/")
  reason := sprintf("Writes to %s require human review", [input.path])
}

# model budget cap per PR
violation[reason] {
  input.kind == "model_call"
  sum(input.spends) > input.budget
  reason := sprintf("Budget exceeded: spent $%.2f > $%.2f", [sum(input.spends), input.budget])
}