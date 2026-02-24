package osint.privacy

default allow = false

deny["pii_not_redacted"] if {
  pii := input.collection.pii_fields[_]
  not redacted(pii)
}

deny["retention_ttl_missing"] if {
  not input.collection.retention_ttl_days
}

deny["retention_ttl_missing"] if {
  input.collection.retention_ttl_days <= 0
}

deny["never_log_field_present"] if {
  never_log := input.collection.never_log_fields[_]
  logged := input.collection.logged_fields[_]
  never_log == logged
}

allow if {
  count(deny) == 0
}

redacted(field) {
  input.collection.redactions[_] == field
}
