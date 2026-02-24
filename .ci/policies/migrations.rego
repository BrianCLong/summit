package migrations
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
  file.additions[_].contains("DROP TABLE")
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
  some line
  line := file.additions[_]
  contains(line, "owner:")
  contains(line, "risk:")
  contains(line, "estimated_runtime:")
  contains(line, "reversible:")
}

violation[{
  "msg": sprintf("Migration %s lacks dual-write/shadow flags", [file.path])
}] {
  file := input.review.files[_]
  glob.match("migrations/**", [], file.path)
  not metadata_flags(file)
}

metadata_flags(file) {
  some line
  line := file.additions[_]
  contains(line, "dual_write")
}
