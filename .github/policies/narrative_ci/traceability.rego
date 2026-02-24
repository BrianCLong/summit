package narrative_ci.traceability

import rego.v1

# Deny if any Claim, Assumption, Frame, or Handoff is missing provenance
deny contains msg if {
    some node in input.new_claims
    missing_provenance(node)
    msg := sprintf("Node %v (type %v) is missing provenance receipts", [node.node_id, node.kind])
}

deny contains msg if {
    some node in input.new_claims # Assuming delta.json structure
    # Check other types if they are in the input list or nested
    node.kind in {"Claim", "Assumption", "Frame", "Handoff"}
    missing_provenance(node)
    msg := sprintf("Node %v (type %v) is missing provenance receipts", [node.node_id, node.kind])
}

missing_provenance(node) if {
    not node.provenance_receipt_ids
}

missing_provenance(node) if {
    count(node.provenance_receipt_ids) == 0
}
