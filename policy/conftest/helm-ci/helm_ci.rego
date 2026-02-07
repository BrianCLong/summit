import future.keywords
package helm_ci

deny contains msg if {
  not input.kind
  msg := "resource is missing a kind"
}

deny contains msg if {
  not input.metadata
  msg := "resource is missing metadata"
}

deny contains msg if {
  input.metadata
  not input.metadata.name
  msg := sprintf("%s resource is missing metadata.name", [input.kind])
}
