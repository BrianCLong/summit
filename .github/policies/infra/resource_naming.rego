package infra.naming

deny[msg] {
  input.resource.name != "valid_name"
  msg := "Invalid resource name"
}
