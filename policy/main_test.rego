package main_test

import data.summit.main as main
import future.keywords.if

test_allow_governance_admin {
	main.allow with input.actor.type as "user"
		with input.actor.roles as ["governance-admin"]
}

test_allow_governance_bot {
	main.allow with input.actor.type as "service"
		with input.actor.roles as ["governance-bot"]
}

test_deny_suspended_tenant {
	main.deny with input.tenant.status as "suspended"
}

test_deny_default {
	not main.allow with input.actor.type as "user"
		with input.actor.roles as ["random-user"]
}
