package helm_ci

default deny = []

deny[msg] {
  not input.kind
  msg := "resource is missing a kind"
}

deny[msg] {
  not input.metadata
  msg := "resource is missing metadata"
}

deny[msg] {
  input.metadata
  not input.metadata.name
  msg := sprintf("%s resource is missing metadata.name", [input.kind])
}
