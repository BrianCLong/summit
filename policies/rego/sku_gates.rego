package intelgraph.sku

import future.keywords.if
import future.keywords.in
import future.keywords.contains

default allow_feature := false

# input.subject.tier: "Team" | "Business" | "Enterprise"
# input.feature: string (e.g., "qos.override", "export.pdf", "edge.sync", "byok", "hsm")

# Define gates
gate["Team"]        = { "export.pdf", "edge.sync" }
gate["Business"]    = gate["Team"]        ∪ { "qos.override", "audit.evidence" }
gate["Enterprise"]  = gate["Business"]    ∪ { "byok", "hsm" }

allow_feature {
  some t
  t := input.subject.tier
  gate[t][_] == input.feature
}
