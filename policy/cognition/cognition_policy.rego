# Cognition Policy - OPA Policies for Digital Twin Cognition Layer
#
# This policy governs cognitive decisions made by the digital twin cognition system.
# It ensures safety, compliance, and appropriate authorization for automated decisions.

package cognition

import future.keywords.if
import future.keywords.in
import future.keywords.contains

# =============================================================================
# Default Deny
# =============================================================================

default allow := false
default require_approval := false

# =============================================================================
# Decision Authorization
# =============================================================================

# Allow decisions with sufficient confidence
allow if {
    input.decision.confidence >= 0.5
    not is_critical_action
    not violates_safety_constraints
    not violates_regulatory_constraints
}

# Allow with approval for high-risk decisions
allow if {
    input.decision.confidence >= 0.5
    require_approval
    input.approval.status == "approved"
}

# =============================================================================
# Approval Requirements
# =============================================================================

# Require approval for critical risk level
require_approval if {
    input.decision.riskAssessment.overallRisk == "CRITICAL"
}

# Require approval for high risk level
require_approval if {
    input.decision.riskAssessment.overallRisk == "HIGH"
}

# Require approval for safety interventions
require_approval if {
    input.decision.type == "SAFETY_INTERVENTION"
}

# Require approval for low confidence decisions
require_approval if {
    input.decision.confidence < 0.6
    input.decision.action.priority > 5
}

# Require approval for configuration changes
require_approval if {
    input.decision.type == "CONFIGURATION_CHANGE"
    input.decision.action.priority > 7
}

# =============================================================================
# Critical Action Detection
# =============================================================================

is_critical_action if {
    input.decision.action.type == "SAFETY_INTERVENTION"
    input.decision.riskAssessment.overallRisk == "CRITICAL"
}

is_critical_action if {
    input.decision.action.type in ["EXECUTE_PROCEDURE", "TRIGGER_WORKFLOW"]
    not input.subject.capabilities contains "automation:execute"
}

# =============================================================================
# Safety Constraints
# =============================================================================

violates_safety_constraints if {
    some constraint in input.context.constraints
    constraint.type == "SAFETY"
    constraint.hardLimit == true
    not constraint_satisfied(constraint)
}

constraint_satisfied(constraint) if {
    # Simplified constraint checking - would parse expression in production
    input.decision.action.parameters.value <= constraint.limit
}

constraint_satisfied(constraint) if {
    not constraint.limit
}

# Safety limits for specific action types
violates_safety_constraints if {
    input.decision.action.type == "ADJUST_SETPOINT"
    abs(input.decision.action.parameters.delta) > 0.5
    not input.approval.status == "approved"
}

# =============================================================================
# Regulatory Constraints
# =============================================================================

violates_regulatory_constraints if {
    some regulation in input.context.regulations
    regulation.status == "ACTIVE"
    some requirement in regulation.requirements
    requirement.complianceStatus == "NON_COMPLIANT"
    action_affects_regulation(input.decision.action, regulation)
}

action_affects_regulation(action, regulation) if {
    # Check if action type is related to regulation
    regulation.type == "ENVIRONMENTAL"
    action.type in ["ADJUST_SETPOINT", "CONTROL_ADJUSTMENT"]
}

action_affects_regulation(action, regulation) if {
    regulation.type == "SAFETY"
    action.type == "SAFETY_INTERVENTION"
}

# =============================================================================
# Tenant and Scope Validation
# =============================================================================

# Ensure decisions are scoped to correct tenant
valid_tenant_scope if {
    input.decision.tenantId == input.subject.tenantId
}

valid_tenant_scope if {
    input.subject.tenantScopes contains input.decision.tenantId
}

# Cross-tenant decisions are blocked
deny_cross_tenant if {
    not valid_tenant_scope
}

# =============================================================================
# Agent Authorization
# =============================================================================

# Agents must have appropriate capabilities
agent_authorized if {
    input.subject.type == "agent"
    required_capability in input.subject.capabilities
}

required_capability := capability if {
    input.decision.type == "CONTROL_ADJUSTMENT"
    capability := "cognition:control"
}

required_capability := capability if {
    input.decision.type == "MAINTENANCE_SCHEDULE"
    capability := "cognition:maintenance"
}

required_capability := capability if {
    input.decision.type == "PROCESS_OPTIMIZATION"
    capability := "cognition:optimization"
}

required_capability := capability if {
    input.decision.type == "ALERT_ESCALATION"
    capability := "cognition:alert"
}

required_capability := capability if {
    input.decision.type == "SAFETY_INTERVENTION"
    capability := "cognition:safety"
}

required_capability := capability if {
    input.decision.type == "CONFIGURATION_CHANGE"
    capability := "cognition:config"
}

required_capability := capability if {
    input.decision.type == "RESOURCE_ALLOCATION"
    capability := "cognition:resource"
}

# Default capability requirement
required_capability := "cognition:basic" if {
    not input.decision.type in [
        "CONTROL_ADJUSTMENT",
        "MAINTENANCE_SCHEDULE",
        "PROCESS_OPTIMIZATION",
        "ALERT_ESCALATION",
        "SAFETY_INTERVENTION",
        "CONFIGURATION_CHANGE",
        "RESOURCE_ALLOCATION"
    ]
}

# =============================================================================
# Audit Requirements
# =============================================================================

# All decisions must be auditable
audit_required if {
    true
}

# Detailed audit for high-risk decisions
detailed_audit_required if {
    input.decision.riskAssessment.overallRisk in ["HIGH", "CRITICAL"]
}

detailed_audit_required if {
    input.decision.type == "SAFETY_INTERVENTION"
}

# =============================================================================
# Learning Constraints
# =============================================================================

# Limit learning rate changes
allow_learning_update if {
    input.update.type == "PARAMETER"
    input.update.learningRate <= 0.1
}

allow_learning_update if {
    input.update.type == "PATTERN"
    input.update.confidence >= 0.5
}

allow_learning_update if {
    input.update.type == "RULE"
    input.update.confidence >= 0.7
}

# Block learning updates that could affect safety
deny_learning_update if {
    input.update.affectsSafety == true
    not input.approval.status == "approved"
}

# =============================================================================
# Explanation Requirements
# =============================================================================

# Require explanations for certain decision types
explanation_required if {
    input.decision.riskAssessment.overallRisk in ["HIGH", "CRITICAL"]
}

explanation_required if {
    input.decision.type in ["SAFETY_INTERVENTION", "CONFIGURATION_CHANGE"]
}

explanation_required if {
    input.decision.confidence < 0.7
}

# =============================================================================
# Rate Limiting
# =============================================================================

# Limit decision frequency per twin
within_rate_limit if {
    count(input.recentDecisions) < 100
}

within_rate_limit if {
    not input.recentDecisions
}

# =============================================================================
# Helper Functions
# =============================================================================

abs(x) := x if {
    x >= 0
}

abs(x) := -x if {
    x < 0
}

# =============================================================================
# Response Generation
# =============================================================================

# Generate response with all evaluations
response := {
    "allowed": allow,
    "requireApproval": require_approval,
    "auditRequired": audit_required,
    "detailedAuditRequired": detailed_audit_required,
    "explanationRequired": explanation_required,
    "withinRateLimit": within_rate_limit,
    "validTenantScope": valid_tenant_scope,
    "violations": violations,
    "reason": reason
}

# Collect all violations
violations contains violation if {
    violates_safety_constraints
    violation := {
        "type": "SAFETY",
        "description": "Decision violates safety constraints"
    }
}

violations contains violation if {
    violates_regulatory_constraints
    violation := {
        "type": "REGULATORY",
        "description": "Decision violates regulatory constraints"
    }
}

violations contains violation if {
    deny_cross_tenant
    violation := {
        "type": "SCOPE",
        "description": "Cross-tenant decision not allowed"
    }
}

violations contains violation if {
    not within_rate_limit
    violation := {
        "type": "RATE_LIMIT",
        "description": "Decision rate limit exceeded"
    }
}

# Generate reason
reason := "Decision allowed" if {
    allow
    not require_approval
}

reason := "Decision requires approval" if {
    require_approval
}

reason := "Decision denied due to policy violations" if {
    not allow
    count(violations) > 0
}

reason := "Decision denied due to insufficient confidence" if {
    not allow
    input.decision.confidence < 0.5
}
