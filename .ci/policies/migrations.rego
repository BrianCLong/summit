package migrations

import future.keywords
import future.keywords.in
import future.keywords.contains

default allow = false

# Require expand/contract strategy and forbid destructive operations unless gated
allow {
  not forbidden_destructive
}

forbidden_destructive {
  some file
  input.review.files[file]
  glob.match("migrations/**", [], file.path)
  contains(file.additions[_], "DROP TABLE")
  not input.params.gate_destructive
}

violation[{
  "msg": sprintf("Destructive change detected in %s without --gate=destructive", [file.path])
}] {
  forbidden_destructive
  file := input.review.files[_]
}

violation[{
  "msg": sprintf("Missing expand/contract metadata for %s", [file.path])
}] {
  file := input.review.files[_]
  glob.match("migrations/**", [], file.path)
  not metadata_contains_required(file)
}

metadata_contains_required(file) {
  some ln in file.additions
  contains(ln, "owner:")
  contains(ln, "risk:")
  contains(ln, "estimated_runtime:")
  contains(ln, "reversible:")
}

violation[{
  "msg": sprintf("Migration %s lacks dual-write/shadow flags", [file.path])
}] {
  file := input.review.files[_]
  glob.match("migrations/**", [], file.path)
  not metadata_flags(file)
}

metadata_flags(file) {
  some ln in file.additions
  contains(ln, "dual_write")
}
