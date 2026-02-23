package agents.archetypes

import future.keywords.in

# Default deny
default allow = false

# Chief of Staff Policies
allow_chief_of_staff_read {
    input.agent.role == "chief_of_staff"
    input.action in ["read", "query", "list", "get", "analyze"]
    input.resource.type in ["calendar", "email", "task", "meeting", "message"]
    input.resource.owner_id == input.user.id
}

allow_chief_of_staff_create {
    input.agent.role == "chief_of_staff"
    input.action in ["create", "schedule"]
    input.resource.type in ["task", "meeting", "reminder"]
    input.resource.owner_id == input.user.id
}

require_approval_chief_of_staff_modify {
    input.agent.role == "chief_of_staff"
    input.action in ["update", "delete", "reschedule"]
    input.resource.type in ["task", "meeting"]
}

require_approval_chief_of_staff_assign {
    input.agent.role == "chief_of_staff"
    input.action == "assign"
    input.resource.type == "task"
    input.resource.assignee_id != input.user.id
}

# COO Policies
allow_coo_read_ops {
    input.agent.role == "coo"
    input.action in ["read", "query", "list", "monitor"]
    input.resource.type in ["sla", "incident", "approval", "process", "metric"]
}

allow_coo_triage_incident {
    input.agent.role == "coo"
    input.action == "triage_incident"
    input.resource.severity in ["P2", "P3", "P4"]
}

require_approval_coo_critical_incident {
    input.agent.role == "coo"
    input.action == "triage_incident"
    input.resource.severity in ["P0", "P1"]
}

allow_coo_create_incident {
    input.agent.role == "coo"
    input.action == "create_incident"
}

allow_coo_send_reminder {
    input.agent.role == "coo"
    input.action == "send_reminder"
    input.resource.type == "approval"
}

require_approval_coo_escalate {
    input.agent.role == "coo"
    input.action == "escalate_incident"
}

allow_coo_process_analysis {
    input.agent.role == "coo"
    input.action in ["analyze", "query"]
    input.resource.type == "process"
}

deny_coo_modify_process {
    input.agent.role == "coo"
    input.action in ["create", "update", "delete"]
    input.resource.type == "process"
}

# RevOps Policies
allow_revops_read_revenue {
    input.agent.role == "revops"
    input.action in ["read", "query", "list", "analyze"]
    input.resource.type in ["opportunity", "forecast", "account", "lead", "pipeline", "attribution"]
}

deny_revops_modify_opportunity {
    input.agent.role == "revops"
    input.action in ["create", "update", "delete"]
    input.resource.type == "opportunity"
}

allow_revops_create_tasks {
    input.agent.role == "revops"
    input.action == "create_tasks"
    input.resource.task_type in ["update_opportunity", "follow_up", "data_cleanup"]
}

allow_revops_analytics {
    input.agent.role == "revops"
    input.action in ["calculate", "predict", "score", "analyze"]
    input.resource.type in ["churn_risk", "lead_score", "attribution", "forecast_variance"]
}

require_approval_revops_intervention {
    input.agent.role == "revops"
    input.action == "create_intervention_plan"
}

allow_revops_reports {
    input.agent.role == "revops"
    input.action == "generate_report"
    input.resource.type in ["variance_report", "pipeline_report", "churn_report"]
}

# Cross-Agent Policies
require_authenticated_user {
    input.user.id != ""
    input.user.roles != []
}

require_organization_context {
    input.organization.id != ""
}

valid_agent_role {
    input.agent.role in ["chief_of_staff", "coo", "revops"]
}

deny_cross_org_access {
    input.resource.organization_id != input.organization.id
}

deny_impersonation {
    input.action == "impersonate"
}

deny_policy_modification {
    input.action in ["create", "update", "delete"]
    input.resource.type == "policy"
}

deny_credential_access {
    input.resource.type in ["credential", "secret", "api_key", "password", "token"]
}

# Classification
allow_classification_read {
    input.action in ["read", "query", "list"]
    classification_level(input.resource.classification) <= classification_level(input.agent.max_classification)
}

classification_level(level) := 0 { level == "UNCLASSIFIED" }
classification_level(level) := 1 { level == "CONFIDENTIAL" }
classification_level(level) := 2 { level == "SECRET" }
classification_level(level) := 3 { level == "TOP_SECRET" }
classification_level(level) := 4 { level == "SCI" }
classification_level(level) := 5 { level == "SAP" }

# Approvals
requires_approval { require_approval_chief_of_staff_modify }
requires_approval { require_approval_chief_of_staff_assign }
requires_approval { require_approval_coo_critical_incident }
requires_approval { require_approval_coo_escalate }
requires_approval { require_approval_revops_intervention }

# Final Decision
allow {
    require_authenticated_user
    require_organization_context
    valid_agent_role
    not deny_cross_org_access
    not deny_impersonation
    not deny_policy_modification
    not deny_credential_access
    any_allow_rule
}

any_allow_rule { allow_chief_of_staff_read }
any_allow_rule { allow_chief_of_staff_create }
any_allow_rule { allow_coo_read_ops }
any_allow_rule { allow_coo_triage_incident }
any_allow_rule { allow_coo_create_incident }
any_allow_rule { allow_coo_send_reminder }
any_allow_rule { allow_coo_process_analysis }
any_allow_rule { allow_revops_read_revenue }
any_allow_rule { allow_revops_create_tasks }
any_allow_rule { allow_revops_analytics }
any_allow_rule { allow_revops_reports }

# Approvers
required_approvers := ["VP_Engineering", "CTO"] { require_approval_coo_critical_incident }
required_approvers := ["VP_Engineering", "CTO"] { require_approval_coo_escalate }
required_approvers := ["VP_Sales", "VP_Customer_Success"] { require_approval_revops_intervention }
required_approvers := [input.resource.assignee_manager] { require_approval_chief_of_staff_assign }
required_approvers := [] { not requires_approval }

# Audit
audit_metadata := {
    "agent_role": input.agent.role,
    "action": input.action,
    "resource_type": input.resource.type,
    "allowed": allow,
    "requires_approval": requires_approval,
    "required_approvers": required_approvers,
    "policy_version": "1.0",
    "evaluated_at": time.now_ns(),
}
