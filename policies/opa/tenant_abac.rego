package summit.tenant_abac

default allow = false

default decision = {
	"allow": false,
	"denied_reasons": {},
	"obligations": {},
}

# Catalog data

default_retention = {
	"default": 30,
	"audit_log": 365,
	"model_feature": 14,
}

role_scopes = {
	"reader": {"allow": ["case:read", "intel:read"]},
	"analyst": {"allow": ["case:read", "case:write", "intel:read", "intel:export:limited"], "step_up": ["case:write"]},
	"investigator": {"allow": ["case:read", "case:write", "subject:link", "intel:read", "intel:export:limited"], "step_up": ["subject:link"]},
	"admin": {"allow": ["case:*", "subject:*", "intel:*"], "cross_tenant": true, "step_up": ["case:delete", "subject:delete"]},
	"platform_super_admin": {"allow": ["*"], "cross_tenant": true, "step_up": ["*"]},
}

purpose_catalog = {
	"investigation": ["legitimate_interest", "public_interest"],
	"fraud": ["legitimate_interest", "legal_obligation"],
	"audit": ["legal_obligation"],
	"support": ["contract"],
	"analytics": ["consent"],
}

assurance_matrix = {
	"case:write": "loa3",
	"case:delete": "loa3",
	"subject:link": "loa3",
	"subject:delete": "loa4",
	"intel:export:limited": "loa2",
	"intel:export": "loa4",
}

data_minimization = {
	"casefile": {
		"investigation": ["summary", "entities", "timeline"],
		"fraud": ["summary", "entities", "fraud_score"],
		"audit": ["summary", "audit_trail"],
	},
	"intel_report": {
		"investigation": ["summary", "sources"],
		"analytics": ["summary", "aggregates"],
	},
}

assurance_rank = {"loa1": 1, "loa2": 2, "loa3": 3, "loa4": 4}

# Helper rules

action_matches(pattern, action) {
	glob.match(pattern, ["*"], action)
}

tenant_allowed {
	input.subject.tenant_id == input.resource.tenant_id
}

tenant_allowed {
	role = input.subject.roles[_]
	scope = role_scopes[role]
	scope.cross_tenant
}

purpose_present {
	input.request.purpose_tag
	input.request.purpose_tag != ""
}

purpose_allowed {
	purpose_present
	allowed_bases = purpose_catalog[input.request.purpose_tag]
	allowed_bases[_] = input.request.legal_basis
}

purpose_matches_resource {
	purpose_present
	input.resource.purpose_tags
	input.resource.purpose_tags[_] = input.request.purpose_tag
}

role_allows_action(role, action) {
	scope = role_scopes[role]
	allowed_action = scope.allow[_]
	action_matches(allowed_action, action)
}

step_up_required(role, action) {
	scope = role_scopes[role]
	scope.step_up
	elevated = scope.step_up[_]
	action_matches(elevated, action)
}

required_assurance(action) = level {
	level = assurance_matrix[action]
}

required_assurance(action) = "loa2" {
	not assurance_matrix[action]
}

assurance_satisfied(action) {
	required = required_assurance(action)
	has = input.subject.assurance
	assurance_rank[has] >= assurance_rank[required]
}

fields_minimized {
	purpose_present
	resource_type = input.resource.type
	allowed = data_minimization[resource_type][input.request.purpose_tag]
	not field_not_allowed(allowed)
}

fields_minimized {
	not input.request.fields
}

field_not_allowed(allowed) {
	input.request.fields
	field = input.request.fields[_]
	not field_allowed(field, allowed)
}

field_allowed(field, allowed) {
	allowed[_] = field
}

retention_compliant {
	not input.resource.contains_pii
}

retention_compliant {
	input.resource.contains_pii
	max_days = default_retention["default"]
	resource_days = input.resource.retention_days
	resource_days <= max_days
}

audit_mutation_attempt {
	startswith(input.request.action, "audit:")
	input.request.action != "audit:read"
}

role_authorized {
	role = input.subject.roles[_]
	role_allows_action(role, input.request.action)
}

role_authorized {
	role = input.subject.roles[_]
	role_scopes[role].allow[_] == "*"
}

# Obligations

obligations[ob] {
	role = input.subject.roles[_]
	step_up_required(role, input.request.action)
	not assurance_satisfied(input.request.action)
	ob = {
		"type": "mfa",
		"method": "webauthn",
		"reason": "step_up_required",
	}
}

obligations[ob] {
	input.resource.contains_pii
	not input.resource.retention_days
	ob = {
		"type": "retention",
		"max_days": default_retention["default"],
		"reason": "pii_default_retention",
	}
}

# Deny conditions

deny["missing_subject"] {
	not input.subject
}

deny["tenant_scope_violation"] {
	not tenant_allowed
}

deny["purpose_missing"] {
	not purpose_present
}

deny["purpose_not_allowed"] {
	purpose_present
	not purpose_allowed
}

deny["purpose_not_in_resource"] {
	purpose_present
	not purpose_matches_resource
}

deny["role_not_authorized"] {
	not role_authorized
}

deny["data_minimization_failed"] {
	not fields_minimized
}

deny["retention_violation"] {
	not retention_compliant
}

deny["audit_immutable"] {
	audit_mutation_attempt
}

deny["assurance_insufficient"] {
	not assurance_satisfied(input.request.action)
	blocking_obligation
}

allow {
	tenant_allowed
	purpose_present
	purpose_allowed
	purpose_matches_resource
	role_authorized
	fields_minimized
	retention_compliant
	not audit_mutation_attempt
	not blocking_obligation
}

decision = {
	"allow": allow,
	"denied_reasons": {reason | deny[reason]},
	"obligations": {ob | obligations[ob]},
}

blocking_obligation {
	obligations[ob]
	ob.type == "mfa"
}
