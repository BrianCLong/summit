package high_risk.operations_test

import future.keywords.if
import data.high_risk.operations.allow
import data.high_risk.operations.deny

test_allow_valid_request if {
	allow with input as {
		"operation_type": "TEMP_DB_READ_ACCESS",
		"parameters": {"duration_minutes": 60},
		"approvals": [
			{"userId": "lead1", "role": "team_lead"},
			{"userId": "sec1", "role": "security_officer"}
		]
	}
}

test_deny_long_duration if {
	deny["Temporary DB access exceeds maximum allowed duration (2 hours)"] with input as {
		"operation_type": "TEMP_DB_READ_ACCESS",
		"parameters": {"duration_minutes": 180},
		"approvals": [
			{"userId": "lead1", "role": "team_lead"},
			{"userId": "sec1", "role": "security_officer"}
		]
	}
}

test_deny_missing_approvals if {
	deny["Temporary DB access requires dual approval (Team Lead + Security Officer)"] with input as {
		"operation_type": "TEMP_DB_READ_ACCESS",
		"parameters": {"duration_minutes": 60},
		"approvals": [
			{"userId": "lead1", "role": "team_lead"}
		]
	}
}

test_deny_wrong_roles if {
	deny["Temporary DB access requires dual approval (Team Lead + Security Officer)"] with input as {
		"operation_type": "TEMP_DB_READ_ACCESS",
		"parameters": {"duration_minutes": 60},
		"approvals": [
			{"userId": "user1", "role": "engineer"},
			{"userId": "user2", "role": "engineer"}
		]
	}
}
