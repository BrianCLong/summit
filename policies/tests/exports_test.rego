package intelgraph.exports

import data.intelgraph.exports

# Allow when purpose is research
allow_when_purpose_research {
  result := exports.deny with input as {"purpose": "research"}
  count(result) == 0
}

# Deny when purpose not research
block_invalid_purpose {
  result := exports.deny with input as {"purpose": "other"}
  count(result) == 1
}

test_missing_purpose_deny {
  deny[msg] with input as {
    "action": "export_bundle",
    "context": {"purpose": ""},
    "selection": []
  }
}

test_classified_node_deny {
  deny[msg] with input as {
    "action": "export_bundle",
    "context": {"purpose": "investigation", "has_clearance": false},
    "selection": [{"id": "n1", "policy": "classified"}]
  }
}
