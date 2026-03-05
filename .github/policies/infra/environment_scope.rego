package infra.environment

deny[msg] {
  input.environment != "dev"
  msg := "Invalid environment"
}
