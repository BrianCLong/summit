package opa.cmk

import future.keywords

deny[msg] {
  not input.encryption.cmk_enabled
  msg := "CMK encryption required"
}
