package opa.export_v2

import future.keywords

deny[msg] {
  input.bundle.sensitivity == "Sensitive"
  not input.user.clearance == "TopSecret"
  msg := "Export denied: insufficient clearance"
}
