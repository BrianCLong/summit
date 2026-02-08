package narrative_ci.determinism

import rego.v1

# Deny if output contains timestamps outside of stamp.json
deny contains msg if {
	input.file != "stamp.json"
	regex.match(".*(timestamp|created_at|updated_at).*", input.content)
	msg := sprintf("File %v contains timestamp-like fields", [input.file])
}
