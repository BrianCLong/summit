import future.keywords.in
import future.keywords.if
package data.retention
# Example policy: PII data must have a retention period
deny contains msg if {
  input.data.pii == true
  not input.data.retention_days
  msg := "PII data must have a retention period"
}
