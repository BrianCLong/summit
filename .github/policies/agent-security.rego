deny[msg] {
  input.agent not in ["cursor","copilot"]
  msg := "Agent not allowed"
}
