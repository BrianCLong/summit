package high_risk.operations

import future.keywords.in

import future.keywords.if
import future.keywords.contains
import future.keywords.every

default allow = false

# Main allow rule
allow if {
	count(deny) == 0
}

# High-risk operation deny rules
deny contains msg if {
	input.operation_type == "TEMP_DB_READ_ACCESS"
	not valid_duration
	msg := "Temporary DB access exceeds maximum allowed duration (2 hours)"
}

deny contains msg if {
	input.operation_type == "TEMP_DB_READ_ACCESS"
	not dual_approval_present
	msg := "Temporary DB access requires dual approval (Team Lead + Security Officer)"
}

# Helper rules
valid_duration if {
	input.parameters.duration_minutes <= 120
}

dual_approval_present if {
	has_role("team_lead")
	has_role("security_officer")
}

has_role(role) if {
	some a in input.approvals
	a.role == role
}
