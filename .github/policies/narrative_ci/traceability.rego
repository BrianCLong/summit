package narrative_ci.traceability

import rego.v1

# Deny if any inferred node lacks provenance receipt
deny contains msg if {
	input.kind == "Narrative"
	not input.provenance_receipt_id
	msg := sprintf("Narrative node %v missing provenance receipt", [input.id])
}

deny contains msg if {
	input.kind == "Frame"
	not input.provenance_receipt_id
	msg := sprintf("Frame node %v missing provenance receipt", [input.id])
}
