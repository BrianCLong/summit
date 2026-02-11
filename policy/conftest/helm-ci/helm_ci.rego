package helm_ci

import future.keywords.contains
import future.keywords.if

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
