package narrative_ci.traceability

import future.keywords.in

default deny = []

deny[msg] {
  node := input.inferred_nodes[_]
  not has_provenance(node)
  msg := sprintf("missing provenance for %s:%s", [node.type, node.id])
}

has_provenance(node) {
  edge := input.provenance_edges[_]
  edge.to == node.id
  edge.from_type == "Artifact"
}

test_traceability_pass {
  input := data.fixtures.traceability_pass
  count(deny with input as input) == 0
}

test_traceability_fail {
  input := data.fixtures.traceability_fail
  count(deny with input as input) > 0
}
