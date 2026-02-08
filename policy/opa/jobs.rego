# Summit Jobs OPA Policy
# Part of Shai-Hulud supply chain security initiative
#
# This policy enforces authorization for background job execution.
# Jobs must include user/tenant context and be permitted by policy.

package summit.jobs

import rego.v1

default decision := {
    "allow": false,
    "reason": "No matching policy rule"
}

# Allow system jobs (no user context)
decision := {
    "allow": true,
    "reason": "System job allowed"
} if {
    input.user_id == "system"
    allowed_system_queues[input.queue]
}

# Allow jobs with valid tenant context
decision := {
    "allow": true,
    "reason": "Tenant job allowed"
} if {
    input.tenant_id != ""
    input.tenant_id != "default"
    not blocked_tenants[input.tenant_id]
}

# Allow specific high-trust users
decision := {
    "allow": true,
    "reason": "Trusted user job allowed"
} if {
    trusted_job_users[input.user_id]
}

# Deny jobs from blocked queues
decision := {
    "allow": false,
    "reason": "Queue is blocked"
} if {
    blocked_queues[input.queue]
}

# System queues that can run without user context
allowed_system_queues := {
    "ingestion",
    "analytics",
    "notifications",
    "reports",
    "webhooks",
    "intents",
    "retention",
    "cache_warmup",
    "consistency"
}

# Queues that are temporarily blocked
blocked_queues := set()

# Tenants that are temporarily blocked from job execution
blocked_tenants := set()

# Users trusted to run any job
trusted_job_users := {
    "admin",
    "system",
    "scheduler"
}
