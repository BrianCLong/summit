# Agent Authorization Policy
# AGENT-12: Policy DSL Enhancements
# OPA policy for agent-specific authorization rules

package summit.agent

import future.keywords.if
import future.keywords.in

# Main decision point
decision := {
    "allowed": allow,
    "reason": reason,
    "obligations": obligations,
    "matched_policies": matched_policies,
}

# Default deny
default allow := false

# Allow if all checks pass
allow if {
    agent_active
    agent_certified_if_required
    tenant_scope_valid
    capability_check
    risk_level_acceptable
    operation_allowed
}

# ============================================================================
# Agent Status Checks
# ============================================================================

agent_active if {
    input.subject.type == "AGENT"
    # Agent would have been rejected at auth if not active
    # But double-check here for defense in depth
}

agent_certified_if_required if {
    # Critical actions require certified agents
    input.action.riskLevel != "critical"
} else if {
    input.subject.isCertified == true
    not certification_expired
}

certification_expired if {
    input.subject.certificationExpiresAt != null
    time.parse_rfc3339_ns(input.subject.certificationExpiresAt) < time.now_ns()
}

# ============================================================================
# Tenant & Scope Validation (AGENT-4)
# ============================================================================

tenant_scope_valid if {
    # Check if agent has access to requested tenant
    count(input.subject.tenantScopes) == 0  # Empty means all tenants
} else if {
    input.resource.tenantId in input.subject.tenantScopes
}

project_scope_valid if {
    # If no project specified, this check passes
    not input.resource.projectId
} else if {
    # Empty project scopes means all projects
    count(input.subject.projectScopes) == 0
} else if {
    input.resource.projectId in input.subject.projectScopes
}

# ============================================================================
# Capability Checks
# ============================================================================

capability_check if {
    required_capability := capability_for_action[input.action.type]
    required_capability in input.subject.capabilities
}

# Map actions to required capabilities
capability_for_action := {
    "read": "read:data",
    "write": "write:data",
    "delete": "delete:data",
    "execute": "execute:commands",
    "query": "query:database",
    "pipeline:trigger": "execute:pipelines",
    "config:modify": "manage:config",
    "user:impersonate": "security:impersonate",
    "export": "export:data",
    "import": "import:data",
}

# ============================================================================
# Risk Level Validation
# ============================================================================

risk_level_acceptable if {
    # Check if action's risk level is within agent's allowed maximum
    risk_hierarchy := ["low", "medium", "high", "critical"]
    max_risk_index := indexof(risk_hierarchy, input.subject.restrictions.maxRiskLevel)
    action_risk_index := indexof(risk_hierarchy, input.action.riskLevel)
    action_risk_index <= max_risk_index
}

# ============================================================================
# Operation Mode Checks (AGENT-5)
# ============================================================================

operation_allowed if {
    # SIMULATION mode - always allow (no real execution)
    input.context.operationMode == "SIMULATION"
} else if {
    # DRY_RUN mode - allow with obligations
    input.context.operationMode == "DRY_RUN"
} else if {
    # ENFORCED mode - apply strict checks
    enforced_mode_checks
}

enforced_mode_checks if {
    not restricted_operation
    not requires_approval_by_policy
}

restricted_operation if {
    # Check if operation is in denied list
    input.subject.restrictions.deniedOperations != null
    input.action.type in input.subject.restrictions.deniedOperations
}

requires_approval_by_policy if {
    # Require approval for risk levels in the requireApproval list
    input.action.riskLevel in input.subject.restrictions.requireApproval
}

# ============================================================================
# Specific Action Policies
# ============================================================================

# Cross-tenant access is always denied
deny_reason contains "cross-tenant access not allowed" if {
    not tenant_scope_valid
}

# Uncertified agents cannot perform critical actions
deny_reason contains "certification required for critical actions" if {
    input.action.riskLevel == "critical"
    not input.subject.isCertified
}

# Expired certification blocks high/critical actions
deny_reason contains "certification expired" if {
    input.action.riskLevel in ["high", "critical"]
    certification_expired
}

# Missing required capability
deny_reason contains concat("", ["missing required capability: ", capability_for_action[input.action.type]]) if {
    not capability_check
}

# Risk level too high for agent
deny_reason contains "action risk level exceeds agent's maximum allowed" if {
    not risk_level_acceptable
}

# Restricted operation
deny_reason contains concat("", ["operation '", input.action.type, "' is explicitly denied for this agent"]) if {
    restricted_operation
}

# ============================================================================
# Obligations
# ============================================================================

obligations contains obligation if {
    # Require approval for high-risk actions in ENFORCED mode
    input.context.operationMode == "ENFORCED"
    requires_approval_by_policy
    obligation := {
        "type": "approval_required",
        "requirement": "human_approval",
        "risk_level": input.action.riskLevel,
    }
}

obligations contains obligation if {
    # Log all critical actions
    input.action.riskLevel == "critical"
    obligation := {
        "type": "audit_log",
        "requirement": "detailed_logging",
        "target": "security_audit_log",
    }
}

obligations contains obligation if {
    # Step-up auth for user impersonation
    input.action.type == "user:impersonate"
    obligation := {
        "type": "step_up_auth",
        "requirement": "mfa",
        "target": "agent_operator",
    }
}

# ============================================================================
# Reason for Decision
# ============================================================================

reason := concat(", ", deny_reason) if {
    count(deny_reason) > 0
} else := "all policy checks passed"

# ============================================================================
# Matched Policies
# ============================================================================

matched_policies contains "agent.tenant_scope" if tenant_scope_valid
matched_policies contains "agent.capability_check" if capability_check
matched_policies contains "agent.risk_level" if risk_level_acceptable
matched_policies contains "agent.certification" if agent_certified_if_required
matched_policies contains "agent.operation_mode" if operation_allowed

# ============================================================================
# Helper Functions
# ============================================================================

# Get index of element in array
indexof(arr, elem) := i if {
    arr[i] == elem
} else := -1 if {
    # Element not found
    true
}

# ============================================================================
# Testing Rules (for policy verification)
# ============================================================================

# Test: Internal agent with basic capabilities can read data
test_basic_read if {
    decision_result := decision with input as {
        "subject": {
            "type": "AGENT",
            "id": "agent-123",
            "name": "Test Agent",
            "agentType": "internal",
            "tenantScopes": ["tenant-1"],
            "projectScopes": [],
            "capabilities": ["read:data"],
            "restrictions": {
                "maxRiskLevel": "medium",
                "requireApproval": ["high", "critical"],
            },
            "isCertified": true,
        },
        "action": {
            "type": "read",
            "riskLevel": "low",
        },
        "resource": {
            "tenantId": "tenant-1",
        },
        "context": {
            "operationMode": "ENFORCED",
        },
    }
    decision_result.allowed == true
}

# Test: Agent cannot access different tenant
test_cross_tenant_denied if {
    decision_result := decision with input as {
        "subject": {
            "type": "AGENT",
            "tenantScopes": ["tenant-1"],
            "capabilities": ["read:data"],
            "restrictions": {"maxRiskLevel": "medium"},
            "isCertified": true,
        },
        "action": {"type": "read", "riskLevel": "low"},
        "resource": {"tenantId": "tenant-2"},
        "context": {"operationMode": "ENFORCED"},
    }
    decision_result.allowed == false
}

# Test: Critical action requires certification
test_critical_requires_cert if {
    decision_result := decision with input as {
        "subject": {
            "type": "AGENT",
            "tenantScopes": ["tenant-1"],
            "capabilities": ["delete:data"],
            "restrictions": {"maxRiskLevel": "critical"},
            "isCertified": false,
        },
        "action": {"type": "delete", "riskLevel": "critical"},
        "resource": {"tenantId": "tenant-1"},
        "context": {"operationMode": "ENFORCED"},
    }
    decision_result.allowed == false
}

# Test: SIMULATION mode always allows
test_simulation_allows if {
    decision_result := decision with input as {
        "subject": {
            "type": "AGENT",
            "tenantScopes": ["tenant-1"],
            "capabilities": ["delete:data"],
            "restrictions": {"maxRiskLevel": "low"},
            "isCertified": false,
        },
        "action": {"type": "delete", "riskLevel": "critical"},
        "resource": {"tenantId": "tenant-1"},
        "context": {"operationMode": "SIMULATION"},
    }
    decision_result.allowed == true
}
