package opa.dlp

import future.keywords

deny[msg] {
  input.data.contains_pii
  msg := "DLP violation: PII detected"
}
