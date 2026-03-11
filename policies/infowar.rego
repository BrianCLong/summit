package infowar

import future.keywords.if
import future.keywords.in

default allow := false

# Law 1: Frontier Sovereignty - only authorized users can read infowar data
allow if {
	input.action == "infowar:read"
	input.user.role in ["analyst", "admin"]
}

# Never Log gate: redaction of PII
# If data has PII markers, deny unless redacted
deny_pii if {
	input.data.has_pii == true
	not input.data.is_redacted
}

# InfoWar Verify Gate: INFOWAR specific data must have a classification label
deny_no_classification if {
	input.data.type == "SITREP"
	not input.data.classification
}

# infowar_verify gate per milestone
infowar_verify if {
    input.data.item_slug == "INFOWAR"
    input.data.evidence_bundle_present == true
}
