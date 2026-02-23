# Agent Archetypes Policy
#
# Defines authorization rules for Summit's AI agent archetypes:
# - Chief of Staff
# - COO (Chief Operating Officer)
# - RevOps (Revenue Operations)
#
# All agent actions must pass through these policies before execution.

package agents.archetypes

# Default deny
default allow = false

# ============================================================================
# CHIEF OF STAFF POLICIES
# ============================================================================

# Chief of Staff can read user's own calendar, email, tasks
allow_chief_of_staff_read {
    input.agent.role == "chief_of_staff"
    input.action == ["read", "query", "list", "get", "analyze"][_]
    input.resource.type == ["calendar", "email", "task", "meeting", "message"][_]
    input.resource.owner_id == input.user.id
}

# Chief of Staff can create tasks/meetings for user
allow_chief_of_staff_create {
    input.agent.role == "chief_of_staff"
    input.action == ["create", "schedule"][_]
    input.resource.type == ["task", "meeting", "reminder"][_]
    input.resource.owner_id == input.user.id
}

# Chief of Staff CANNOT modify existing tasks/meetings without approval
require_approval_chief_of_staff_modify {
    input.agent.role == "chief_of_staff"
    input.action == ["update", "delete", "reschedule"][_]
    input.resource.type == ["task", "meeting"][_]
}

# Chief of Staff CANNOT assign tasks to others without approval
require_approval_chief_of_staff_assign {
    input.agent.role == "chief_of_staff"
    input.action == "assign"
    input.resource.type == "task"
    input.resource.assignee_id != input.user.id
}

# ============================================================================
# COO POLICIES
# ============================================================================

# COO can read all operational metrics, SLAs, incidents
allow_coo_read_ops {
    input.agent.role == "coo"
    input.action == ["read", "query", "list", "monitor"][_]
    input.resource.type == ["sla", "incident", "approval", "process", "metric"][_]
}

# COO can triage incidents P2-P4 without approval
allow_coo_triage_incident {
    input.agent.role == "coo"
    input.action == "triage_incident"
    input.resource.severity == ["P2", "P3", "P4"][_]
}

# COO requires approval for P0/P1 incidents (critical)
require_approval_coo_critical_incident {
    input.agent.role == "coo"
    input.action == "triage_incident"
    input.resource.severity == ["P0", "P1"][_]
}

# COO can create incidents without approval
allow_coo_create_incident {
    input.agent.role == "coo"
    input.action == "create_incident"
}

# COO can send reminders for approvals without approval
allow_coo_send_reminder {
    input.agent.role == "coo"
    input.action == "send_reminder"
    input.resource.type == "approval"
}

# COO requires approval to escalate incidents
require_approval_coo_escalate {
    input.agent.role == "coo"
    input.action == "escalate_incident"
}

# COO can query process drift but cannot modify processes
allow_coo_process_analysis {
    input.agent.role == "coo"
    input.action == ["analyze", "query"][_]
    input.resource.type == "process"
}

deny_coo_modify_process {
    input.agent.role == "coo"
    input.action == ["create", "update", "delete"][_]
    input.resource.type == "process"
}

# ============================================================================
# REVOPS POLICIES
# ============================================================================

# RevOps can read pipeline, forecast, account data
allow_revops_read_revenue {
    input.agent.role == "revops"
    input.action == ["read", "query", "list", "analyze"][_]
    input.resource.type == ["opportunity", "forecast", "account", "lead", "pipeline", "attribution"][_]
}

# RevOps CANNOT create or modify opportunities
deny_revops_modify_opportunity {
    input.agent.role == "revops"
    input.action == ["create", "update", "delete"][_]
    input.resource.type == "opportunity"
}

# RevOps can create tasks for sales reps (pipeline cleanup)
allow_revops_create_tasks {
    input.agent.role == "revops"
    input.action == "create_tasks"
    input.resource.task_type == ["update_opportunity", "follow_up", "data_cleanup"][_]
}

# RevOps can calculate churn risk and attribution (read-only analysis)
allow_revops_analytics {
    input.agent.role == "revops"
    input.action == ["calculate", "predict", "score", "analyze"][_]
    input.resource.type == ["churn_risk", "lead_score", "attribution", "forecast_variance"][_]
}

# RevOps requires approval for intervention plans (high-value accounts)
require_approval_revops_intervention {
    input.agent.role == "revops"
    input.action == "create_intervention_plan"
}

# RevOps can generate reports without approval
allow_revops_reports {
    input.agent.role == "revops"
    input.action == "generate_report"
    input.resource.type == ["variance_report", "pipeline_report", "churn_report"][_]
}

# ============================================================================
# CROSS-AGENT POLICIES
# ============================================================================

# All agents require user authentication
require_authenticated_user {
    input.user.id != ""
    input.user.roles != []
}

# All agents must operate within organization context
require_organization_context {
    input.organization.id != ""
}

# All agents must have valid role
valid_agent_role {
    input.agent.role == ["chief_of_staff", "coo", "revops"][_]
}

# Agents cannot access data outside their organization
deny_cross_org_access {
    input.resource.organization_id != input.organization.id
}

# Agents cannot impersonate users
deny_impersonation {
    input.action == "impersonate"
}

# Agents cannot modify policies
deny_policy_modification {
    input.action == ["create", "update", "delete"][_]
    input.resource.type == "policy"
}

# Agents cannot access credentials or secrets
deny_credential_access {
    input.resource.type == ["credential", "secret", "api_key", "password", "token"][_]
}

# ============================================================================
# CLASSIFICATION-BASED ACCESS CONTROL
# ============================================================================

# Agents can only access data at or below their classification level
allow_classification_read {
    input.action == ["read", "query", "list"][_]
    classification_level(input.resource.classification) <= classification_level(input.agent.max_classification)
}

classification_level("UNCLASSIFIED") = 0
classification_level("CONFIDENTIAL") = 1
classification_level("SECRET") = 2
classification_level("TOP_SECRET") = 3
classification_level("SCI") = 4
classification_level("SAP") = 5

# ============================================================================
# APPROVAL REQUIREMENTS
# ============================================================================

# Aggregate all approval requirements
requires_approval {
    require_approval_chief_of_staff_modify
}

requires_approval {
    require_approval_chief_of_staff_assign
}

requires_approval {
    require_approval_coo_critical_incident
}

requires_approval {
    require_approval_coo_escalate
}

requires_approval {
    require_approval_revops_intervention
}

# ============================================================================
# FINAL DECISION
# ============================================================================

# Allow if any allow rule matches and no deny rules match
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

# Determine required approvers based on action and resource
required_approvers = ["VP_Engineering", "CTO"] {
    require_approval_coo_critical_incident
}
else = ["VP_Engineering", "CTO"] {
    require_approval_coo_escalate
}
else = ["VP_Sales", "VP_Customer_Success"] {
    require_approval_revops_intervention
}
else = [input.resource.assignee_manager] {
    require_approval_chief_of_staff_assign
}
else = []

# ============================================================================
# AUDIT METADATA
# ============================================================================

# Generate audit metadata for logging
audit_metadata := {
    "agent_role": input.agent.role,
    "action": input.action,
    "resource_type": input.resource.type,
    "allowed": allow,
    "requires_approval": requires_approval_val,
    "required_approvers": required_approvers,
    "policy_version": "1.0",
    "evaluated_at": time.now_ns(),
} {
  requires_approval_val := is_requires_approval
}

is_requires_approval {
  requires_approval
}
else = false
