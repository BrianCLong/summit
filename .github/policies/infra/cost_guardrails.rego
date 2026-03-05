package infra.cost

deny[msg] {
  input.cost > 100
  msg := "Cost too high"
}
