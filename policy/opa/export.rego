package intelgraph.policy.export

default allow := false

deny contains reason if {
  input.action == "export"
  some i
  s := input.dataset.sources[i]
  s.license in {"DISALLOW_EXPORT", "VIEW_ONLY", "SEAL_ONLY", "SELF_EDIT_SYNTHETIC"}
  reason := sprintf(
    "Export blocked by license %s (owner: %s). See appeal workflow.",
    [s.license, s.owner],
  )
}

deny contains reason if {
  input.action == "export"
  some i
  s := input.dataset.sources[i]
  s.license == "SELF_EDIT_SYNTHETIC"
  not input.context.self_edit_reviewed
  reason := "Self-edit synthetic data requires compliance approval before export"
}

allow if {
  input.action == "export"
  count(deny) == 0
}
