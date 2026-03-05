package infra.dependency

allowed_dependencies = {"module-a", "module-b"}

deny[msg] {
  not allowed_dependencies[input.dependency]
  msg := "Dependency not allowed"
}
