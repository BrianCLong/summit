package data.retention
# Example policy: PII data must have a retention period
deny[msg] {
  input.data.pii == true
  not input.data.retention_days
  msg := "PII data must have a retention period"
}