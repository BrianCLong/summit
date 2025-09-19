package db.migrations

deny[msg] {
  endswith(input.filename, ".sql")
  contains(lower(input.content), "drop table")
  not input.metadata.has_rollback
  msg := sprintf("Destructive change without rollback: %s", [input.filename])
}