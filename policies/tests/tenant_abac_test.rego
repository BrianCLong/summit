package policies.tenant_abac_test

import data.summit.tenant_abac

# Helper to evaluate decision for given input
decide(i) = result {
	result = tenant_abac.decision with input as i
}

# Happy path should allow with no denies
TestAllowInvestigationWrite {
	input := {
		"subject": {
			"id": "user-1",
			"tenant_id": "tenant-a",
			"roles": ["analyst"],
			"assurance": "loa3",
		},
		"resource": {
			"id": "case-1",
			"tenant_id": "tenant-a",
			"type": "casefile",
			"classification": "confidential",
			"contains_pii": true,
			"purpose_tags": ["investigation", "fraud"],
			"retention_days": 30,
		},
		"request": {
			"action": "case:write",
			"purpose_tag": "investigation",
			"fields": ["summary", "entities"],
			"legal_basis": "legitimate_interest",
			"justification": "Follow-up signal",
		},
	}
	result := decide(input)
	result.allow
	count(result.denied_reasons) == 0
}

# Missing purpose tag should be denied
TestDenyMissingPurposeTag {
	input := {
		"subject": {
			"id": "user-1",
			"tenant_id": "tenant-a",
			"roles": ["analyst"],
			"assurance": "loa3",
		},
		"resource": {
			"id": "case-1",
			"tenant_id": "tenant-a",
			"type": "casefile",
			"classification": "confidential",
			"contains_pii": true,
			"purpose_tags": ["investigation"],
			"retention_days": 30,
		},
		"request": {
			"action": "case:write",
			"purpose_tag": "",
			"fields": ["summary", "entities"],
			"legal_basis": "legitimate_interest",
			"justification": "Follow-up signal",
		},
	}
	result := decide(input)
	not result.allow
	result.denied_reasons[_] == "purpose_missing"
}

# Cross-tenant access denied unless admin with cross_tenant scope
TestDenyCrossTenantAccess {
	input := {
		"subject": {
			"id": "user-1",
			"tenant_id": "tenant-a",
			"roles": ["analyst"],
			"assurance": "loa3",
		},
		"resource": {
			"id": "case-1",
			"tenant_id": "tenant-b",
			"type": "casefile",
			"classification": "confidential",
			"contains_pii": true,
			"purpose_tags": ["investigation"],
			"retention_days": 30,
		},
		"request": {
			"action": "case:write",
			"purpose_tag": "investigation",
			"fields": ["summary", "entities"],
			"legal_basis": "legitimate_interest",
			"justification": "Follow-up signal",
		},
	}
	result := decide(input)
	not result.allow
	result.denied_reasons[_] == "tenant_scope_violation"
}

# Attempt to mutate audit stream blocked outright
TestDenyAuditMutation {
	input := {
		"subject": {
			"id": "user-1",
			"tenant_id": "tenant-a",
			"roles": ["analyst"],
			"assurance": "loa3",
		},
		"resource": {
			"id": "audit-1",
			"tenant_id": "tenant-a",
			"type": "audit_log",
			"classification": "confidential",
			"contains_pii": false,
			"purpose_tags": ["audit"],
			"retention_days": 365,
		},
		"request": {
			"action": "audit:delete",
			"purpose_tag": "audit",
			"fields": ["summary"],
			"legal_basis": "legal_obligation",
			"justification": "cleanup",
		},
	}
	result := decide(input)
	not result.allow
	result.denied_reasons[_] == "audit_immutable"
}

# Misuse case: request additional fields beyond minimization map should be denied.
TestDenyDataMinimizationBreach {
	input := {
		"subject": {
			"id": "user-1",
			"tenant_id": "tenant-a",
			"roles": ["analyst"],
			"assurance": "loa3",
		},
		"resource": {
			"id": "case-1",
			"tenant_id": "tenant-a",
			"type": "casefile",
			"classification": "confidential",
			"contains_pii": true,
			"purpose_tags": ["investigation", "fraud"],
			"retention_days": 30,
		},
		"request": {
			"action": "case:write",
			"purpose_tag": "investigation",
			"fields": ["summary", "entities", "raw_payload"],
			"legal_basis": "legitimate_interest",
			"justification": "Follow-up",
		},
	}
	result := decide(input)
	not result.allow
	result.denied_reasons[_] == "data_minimization_failed"
}

# Step up obligation: analyst lacking WebAuthn (loa2) should surface mfa obligation
TestStepUpObligationForWrite {
	input := {
		"subject": {
			"id": "user-1",
			"tenant_id": "tenant-a",
			"roles": ["analyst"],
			"assurance": "loa2",
		},
		"resource": {
			"id": "case-1",
			"tenant_id": "tenant-a",
			"type": "casefile",
			"classification": "confidential",
			"contains_pii": true,
			"purpose_tags": ["investigation", "fraud"],
			"retention_days": 30,
		},
		"request": {
			"action": "case:write",
			"purpose_tag": "investigation",
			"fields": ["summary", "entities"],
			"legal_basis": "legitimate_interest",
			"justification": "Follow-up signal",
		},
	}
	result := decide(input)
	not result.allow
	obligations := [o | result.obligations[_] = o]
	obligations[_] == {"type": "mfa", "method": "webauthn", "reason": "step_up_required"}
	not any_denied_reason(result.denied_reasons, "assurance_insufficient")
}

# PII lacking explicit retention returns obligation but not denial if writer supplies no retention.
TestRetentionObligationWhenMissing {
	input := {
		"subject": {
			"id": "user-1",
			"tenant_id": "tenant-a",
			"roles": ["analyst"],
			"assurance": "loa3",
		},
		"resource": {
			"id": "case-1",
			"tenant_id": "tenant-a",
			"type": "casefile",
			"classification": "confidential",
			"contains_pii": true,
			"purpose_tags": ["investigation", "fraud"],
			"retention_days": null,
		},
		"request": {
			"action": "case:write",
			"purpose_tag": "investigation",
			"fields": ["summary", "entities"],
			"legal_basis": "legitimate_interest",
			"justification": "Follow-up signal",
		},
	}
	result := decide(input)
	result.allow
	obligations := [o | result.obligations[_] = o]
	some obligation
	obligations[_] = obligation
	obligation.type == "retention"
	obligation.max_days == 30
}

any_denied_reason(denied, reason) {
	denied[_] == reason
}
