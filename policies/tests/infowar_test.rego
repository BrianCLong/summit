package infowar_test

import future.keywords.if
import data.infowar

test_allow_analyst if {
	infowar.allow with input as {"action": "infowar:read", "user": {"role": "analyst"}}
}

test_deny_guest if {
	not infowar.allow with input as {"action": "infowar:read", "user": {"role": "guest"}}
}

test_deny_unredacted_pii if {
	infowar.deny_pii with input as {"data": {"has_pii": true, "is_redacted": false}}
}

test_infowar_verify_success if {
    infowar.infowar_verify with input as {"data": {"item_slug": "INFOWAR", "evidence_bundle_present": true}}
}
