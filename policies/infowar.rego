package infowar

import future.keywords.if
import future.keywords.in

default allow := false

allow if {
	input.action == "infowar:read"
	input.user.role in ["analyst", "admin"]
}

deny_pii if {
	input.data.has_pii == true
	not input.data.is_redacted
}

deny_no_classification if {
	input.data.type == "SITREP"
	not input.data.classification
}

infowar_verify if {
    input.data.item_slug == "INFOWAR"
    input.data.evidence_bundle_present == true
}
