package data.retention

import future.keywords.if
import future.keywords.contains
# Example policy: PII data must have a retention period
deny contains msg if {
  input.data.pii == true
  not input.data.retention_days
  msg := "PII data must have a retention period"
}
