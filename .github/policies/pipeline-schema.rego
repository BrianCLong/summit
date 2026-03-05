package summit.pipeline

deny[msg] {
  not input.version
  msg := "Pipeline must declare version"
}

deny[msg] {
  not input.id
  msg := "Pipeline must declare id"
}
