package intelgraph.policy.export

default allow := false

deny contains reason if {
  input.action == "export"
  some i
  s := input.dataset.sources[i]
  s.license in {"DISALLOW_EXPORT", "VIEW_ONLY", "SEAL_ONLY"}
  reason := sprintf(
    "Export blocked by license %s (owner: %s). See appeal workflow.",
    [s.license, s.owner],
  )
}

allow if {
  input.action == "export"
  count(deny) == 0
}
