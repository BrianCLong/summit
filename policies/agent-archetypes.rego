# Agent Archetypes Policy
#
# Defines authorization rules for Summit's AI agent archetypes:
# - Chief of Staff
# - COO (Chief Operating Officer)
# - RevOps (Revenue Operations)
#
# All agent actions must pass through these policies before execution.

package agents.archetypes

import future.keywords.if
import future.keywords.in

# Default deny
default allow = false

# ============================================================================
# CHIEF OF STAFF POLICIES
# ============================================================================

# Chief of Staff can read user's own calendar, email, tasks
allow_chief_of_staff_read if {
    input.agent.role == "chief_of_staff"
    input.action in ["read", "query", "list", "get", "analyze"]
    input.resource.type in ["calendar", "email", "task", "meeting", "message"]
    input.resource.owner_id == input.user.id
}

# Chief of Staff can create tasks/meetings for user
allow_chief_of_staff_create if {
    input.agent.role == "chief_of_staff"
    input.action in ["create", "schedule"]
    input.resource.type in ["task", "meeting", "reminder"]
    input.resource.owner_id == input.user.id
}

# Chief of Staff CANNOT modify existing tasks/meetings without approval
require_approval_chief_of_staff_modify if {
    input.agent.role == "chief_of_staff"
    input.action in ["update", "delete", "reschedule"]
    input.resource.type in ["task", "meeting"]
}

# Chief of Staff CANNOT assign tasks to others without approval
require_approval_chief_of_staff_assign if {
    input.agent.role == "chief_of_staff"
    input.action == "assign"
    input.resource.type == "task"
    input.resource.assignee_id != input.user.id
}

# ============================================================================
# COO POLICIES
# ============================================================================

# COO can read all operational metrics, SLAs, incidents
allow_coo_read_ops if {
    input.agent.role == "coo"
    input.action in ["read", "query", "list", "monitor"]
    input.resource.type in ["sla", "incident", "approval", "process", "metric"]
}

# COO can triage incidents P2-P4 without approval
allow_coo_triage_incident if {
    input.agent.role == "coo"
    input.action == "triage_incident"
    input.resource.severity in ["P2", "P3", "P4"]
}

# COO requires approval for P0/P1 incidents (critical)
require_approval_coo_critical_incident if {
    input.agent.role == "coo"
    input.action == "triage_incident"
    input.resource.severity in ["P0", "P1"]
}

# COO can create incidents without approval
allow_coo_create_incident if {
    input.agent.role == "coo"
    input.action == "create_incident"
}

# COO can send reminders for approvals without approval
allow_coo_send_reminder if {
    input.agent.role == "coo"
    input.action == "send_reminder"
    input.resource.type == "approval"
}

# COO requires approval to escalate incidents
require_approval_coo_escalate if {
    input.agent.role == "coo"
    input.action == "escalate_incident"
}

# COO can query process drift but cannot modify processes
allow_coo_process_analysis if {
    input.agent.role == "coo"
    input.action in ["analyze", "query"]
    input.resource.type == "process"
}

deny_coo_modify_process if {
    input.agent.role == "coo"
    input.action in ["create", "update", "delete"]
    input.resource.type == "process"
}

# ============================================================================
# REVOPS POLICIES
# ============================================================================

# RevOps can read pipeline, forecast, account data
allow_revops_read_revenue if {
    input.agent.role == "revops"
    input.action in ["read", "query", "list", "analyze"]
    input.resource.type in ["opportunity", "forecast", "account", "lead", "pipeline", "attribution"]
}

# RevOps CANNOT create or modify opportunities
deny_revops_modify_opportunity if {
    input.agent.role == "revops"
    input.action in ["create", "update", "delete"]
    input.resource.type == "opportunity"
}

# RevOps can create tasks for sales reps (pipeline cleanup)
allow_revops_create_tasks if {
    input.agent.role == "revops"
    input.action == "create_tasks"
    input.resource.task_type in ["update_opportunity", "follow_up", "data_cleanup"]
}

# RevOps can calculate churn risk and attribution (read-only analysis)
allow_revops_analytics if {
    input.agent.role == "revops"
    input.action in ["calculate", "predict", "score", "analyze"]
    input.resource.type in ["churn_risk", "lead_score", "attribution", "forecast_variance"]
}

# RevOps requires approval for intervention plans (high-value accounts)
require_approval_revops_intervention if {
    input.agent.role == "revops"
    input.action == "create_intervention_plan"
}

# RevOps can generate reports without approval
allow_revops_reports if {
    input.agent.role == "revops"
    input.action == "generate_report"
    input.resource.type in ["variance_report", "pipeline_report", "churn_report"]
}

# ============================================================================
# CROSS-AGENT POLICIES
# ============================================================================

# All agents require user authentication
require_authenticated_user if {
    input.user.id != ""
    input.user.roles != []
}

# All agents must operate within organization context
require_organization_context if {
    input.organization.id != ""
}

# All agents must have valid role
valid_agent_role if {
    input.agent.role in ["chief_of_staff", "coo", "revops"]
}

# Agents cannot access data outside their organization
deny_cross_org_access if {
    input.resource.organization_id != input.organization.id
}

# Agents cannot impersonate users
deny_impersonation if {
    input.action == "impersonate"
}

# Agents cannot modify policies
deny_policy_modification if {
    input.action in ["create", "update", "delete"]
    input.resource.type == "policy"
}

# Agents cannot access credentials or secrets
deny_credential_access if {
    input.resource.type in ["credential", "secret", "api_key", "password", "token"]
}

# ============================================================================
# CLASSIFICATION-BASED ACCESS CONTROL
# ============================================================================

# Agents can only access data at or below their classification level
allow_classification_read if {
    input.action in ["read", "query", "list"]
    classification_level(input.resource.classification) <= classification_level(input.agent.max_classification)
}

classification_level(level) := 0 if { level == "UNCLASSIFIED" }
classification_level(level) := 1 if { level == "CONFIDENTIAL" }
classification_level(level) := 2 if { level == "SECRET" }
classification_level(level) := 3 if { level == "TOP_SECRET" }
classification_level(level) := 4 if { level == "SCI" }
classification_level(level) := 5 if { level == "SAP" }

# ============================================================================
# APPROVAL REQUIREMENTS
# ============================================================================

# Aggregate all approval requirements
requires_approval if {
    require_approval_chief_of_staff_modify
}

requires_approval if {
    require_approval_chief_of_staff_assign
}

requires_approval if {
    require_approval_coo_critical_incident
}

requires_approval if {
    require_approval_coo_escalate
}

requires_approval if {
    require_approval_revops_intervention
}

# ============================================================================
# FINAL DECISION
# ============================================================================

# Allow if any allow rule matches and no deny rules match
allow if {
    require_authenticated_user
    require_organization_context
    valid_agent_role
    not deny_cross_org_access
    not deny_impersonation
    not deny_policy_modification
    not deny_credential_access
    (
        allow_chief_of_staff_read
        or allow_chief_of_staff_create
        or allow_coo_read_ops
        or allow_coo_triage_incident
        or allow_coo_create_incident
        or allow_coo_send_reminder
        or allow_coo_process_analysis
        or allow_revops_read_revenue
        or allow_revops_create_tasks
        or allow_revops_analytics
        or allow_revops_reports
    )
}

# Determine required approvers based on action and resource
required_approvers := approvers if {
    require_approval_coo_critical_incident
    approvers := ["VP_Engineering", "CTO"]
}

required_approvers := approvers if {
    require_approval_coo_escalate
    approvers := ["VP_Engineering", "CTO"]
}

required_approvers := approvers if {
    require_approval_revops_intervention
    approvers := ["VP_Sales", "VP_Customer_Success"]
}

required_approvers := approvers if {
    require_approval_chief_of_staff_assign
    approvers := [input.resource.assignee_manager]
}

required_approvers := [] if {
    not requires_approval
}

# ============================================================================
# AUDIT METADATA
# ============================================================================

# Generate audit metadata for logging
audit_metadata := metadata if {
    metadata := {
        "agent_role": input.agent.role,
        "action": input.action,
        "resource_type": input.resource.type,
        "allowed": allow,
        "requires_approval": requires_approval,
        "required_approvers": required_approvers,
        "policy_version": "1.0",
        "evaluated_at": time.now_ns(),
    }
}
