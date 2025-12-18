# Information Barriers Policy
# Enforces data flow boundaries between tenants, business units, roles, and environments
#
# @package dlp.barriers
# @version 1.0.0

package dlp.barriers

import future.keywords.if
import future.keywords.in
import future.keywords.contains

# Default deny - all cross-boundary flows are blocked unless explicitly allowed
default allow := false
default barrier_violation := true

# =============================================================================
# TENANT ISOLATION
# =============================================================================

# Tenant isolation is mandatory and cannot be overridden
tenant_isolated if {
    input.source.tenant_id == input.target.tenant_id
}

tenant_isolated if {
    # Platform services can communicate with any tenant
    input.source.tenant_id == "PLATFORM"
}

tenant_isolated if {
    # Shared services explicitly marked as cross-tenant
    input.resource.type == "SHARED_SERVICE"
    input.target.tenant_id == "PLATFORM"
}

tenant_violation := {
    "type": "TENANT_ISOLATION",
    "message": sprintf("Cross-tenant data flow blocked: %s -> %s", [input.source.tenant_id, input.target.tenant_id]),
    "severity": "CRITICAL",
    "source_tenant": input.source.tenant_id,
    "target_tenant": input.target.tenant_id
} if {
    not tenant_isolated
}

# =============================================================================
# BUSINESS UNIT BARRIERS (Chinese Walls)
# =============================================================================

# Business unit walls configuration
bu_walls := data.barriers.business_unit_walls

# Check if business units are separated by a wall
bu_wall_exists(source_bu, target_bu) if {
    wall := bu_walls[_]
    source_bu in wall.units
    target_bu in wall.units
    source_bu != target_bu
}

# Business unit barrier check
bu_barrier_clear if {
    input.source.business_unit == input.target.business_unit
}

bu_barrier_clear if {
    not bu_wall_exists(input.source.business_unit, input.target.business_unit)
}

bu_barrier_clear if {
    # Exception approved
    exception := data.exceptions[_]
    exception.type == "BUSINESS_UNIT_WALL"
    exception.source_bu == input.source.business_unit
    exception.target_bu == input.target.business_unit
    exception.valid_from <= time.now_ns()
    exception.valid_until >= time.now_ns()
    input.actor.id in exception.allowed_actors
}

bu_violation := {
    "type": "BUSINESS_UNIT_WALL",
    "message": sprintf("Business unit wall violation: %s -> %s", [input.source.business_unit, input.target.business_unit]),
    "severity": "HIGH",
    "source_bu": input.source.business_unit,
    "target_bu": input.target.business_unit,
    "wall": wall_name
} if {
    not bu_barrier_clear
    wall := bu_walls[_]
    input.source.business_unit in wall.units
    input.target.business_unit in wall.units
    wall_name := wall.name
}

# =============================================================================
# ROLE-BASED BARRIERS (Clearance Hierarchy)
# =============================================================================

# Classification hierarchy (higher index = higher clearance required)
classification_levels := {
    "PUBLIC": 0,
    "INTERNAL": 1,
    "CONFIDENTIAL": 2,
    "RESTRICTED": 3,
    "TOP_SECRET": 4
}

# Clearance hierarchy
clearance_levels := {
    "NONE": 0,
    "BASIC": 1,
    "ELEVATED": 2,
    "SECRET": 3,
    "TOP_SECRET": 4
}

# Get classification level of data
data_classification_level := classification_levels[input.resource.classification] if {
    input.resource.classification
} else := 0

# Get actor's clearance level
actor_clearance_level := clearance_levels[input.actor.clearance] if {
    input.actor.clearance
} else := 0

# Role barrier check - actor must have sufficient clearance
role_barrier_clear if {
    actor_clearance_level >= data_classification_level
}

role_barrier_clear if {
    # Step-up authentication allows temporary elevation
    input.actor.step_up_verified == true
    input.actor.step_up_level >= data_classification_level
}

role_violation := {
    "type": "ROLE_CLEARANCE",
    "message": sprintf("Insufficient clearance: actor has %s, data requires %s", [input.actor.clearance, input.resource.classification]),
    "severity": "HIGH",
    "actor_clearance": input.actor.clearance,
    "required_clearance": input.resource.classification,
    "remediation": "Request elevated access or step-up authentication"
} if {
    not role_barrier_clear
}

# =============================================================================
# ENVIRONMENT BOUNDARIES
# =============================================================================

# Environment flow rules
env_flow_allowed := {
    {"from": "production", "to": "production"},
    {"from": "production", "to": "audit"},
    {"from": "staging", "to": "staging"},
    {"from": "development", "to": "development"},
    {"from": "testing", "to": "testing"},
    {"from": "synthetic", "to": "staging"},
    {"from": "synthetic", "to": "development"},
    {"from": "synthetic", "to": "testing"}
}

# PII flow restrictions by environment
env_pii_allowed := {
    "production": true,
    "audit": true,
    "staging": false,
    "development": false,
    "testing": false
}

# Environment barrier check
env_barrier_clear if {
    input.source.environment == input.target.environment
}

env_barrier_clear if {
    {"from": input.source.environment, "to": input.target.environment} in env_flow_allowed
}

env_barrier_clear if {
    # Production data can flow to lower envs if anonymized
    input.source.environment == "production"
    input.resource.anonymized == true
}

# PII in environment check
env_pii_violation := {
    "type": "ENVIRONMENT_PII",
    "message": sprintf("PII not allowed in %s environment", [input.target.environment]),
    "severity": "CRITICAL",
    "environment": input.target.environment,
    "remediation": "Use anonymized or synthetic data"
} if {
    input.resource.contains_pii == true
    not env_pii_allowed[input.target.environment]
}

env_violation := {
    "type": "ENVIRONMENT_BOUNDARY",
    "message": sprintf("Environment boundary violation: %s -> %s", [input.source.environment, input.target.environment]),
    "severity": "HIGH",
    "source_env": input.source.environment,
    "target_env": input.target.environment,
    "remediation": "Use approved data pipeline for cross-environment transfers"
} if {
    not env_barrier_clear
}

# =============================================================================
# GEOGRAPHIC/JURISDICTIONAL BARRIERS
# =============================================================================

# Cross-border data transfer rules
jurisdiction_rules := data.barriers.jurisdiction_rules

# Check if cross-border transfer is allowed
jurisdiction_barrier_clear if {
    input.source.jurisdiction == input.target.jurisdiction
}

jurisdiction_barrier_clear if {
    # Check adequacy decision
    rule := jurisdiction_rules[_]
    rule.from == input.source.jurisdiction
    rule.to == input.target.jurisdiction
    rule.allowed == true
}

jurisdiction_barrier_clear if {
    # Standard contractual clauses in place
    input.transfer.scc_in_place == true
}

jurisdiction_barrier_clear if {
    # Binding corporate rules
    input.transfer.bcr_approved == true
}

jurisdiction_violation := {
    "type": "JURISDICTION_BOUNDARY",
    "message": sprintf("Cross-border transfer requires authorization: %s -> %s", [input.source.jurisdiction, input.target.jurisdiction]),
    "severity": "HIGH",
    "source_jurisdiction": input.source.jurisdiction,
    "target_jurisdiction": input.target.jurisdiction,
    "remediation": "Ensure SCCs or BCRs are in place, or obtain explicit consent"
} if {
    not jurisdiction_barrier_clear
}

# =============================================================================
# COMBINED BARRIER CHECK
# =============================================================================

# All barriers must be clear for data to flow
all_barriers_clear if {
    tenant_isolated
    bu_barrier_clear
    role_barrier_clear
    env_barrier_clear
    jurisdiction_barrier_clear
}

# Collect all violations
violations contains violation if {
    violation := tenant_violation
}

violations contains violation if {
    violation := bu_violation
}

violations contains violation if {
    violation := role_violation
}

violations contains violation if {
    violation := env_violation
}

violations contains violation if {
    violation := env_pii_violation
}

violations contains violation if {
    violation := jurisdiction_violation
}

# =============================================================================
# DECISION OUTPUT
# =============================================================================

# Main allow decision
allow if {
    all_barriers_clear
    count(violations) == 0
}

# No barrier violation if all clear
barrier_violation := false if {
    all_barriers_clear
}

# Decision output
decision := {
    "allowed": allow,
    "barrier_violation": barrier_violation,
    "violations": violations,
    "barriers_checked": [
        "tenant_isolation",
        "business_unit_walls",
        "role_clearance",
        "environment_boundary",
        "jurisdiction_boundary"
    ],
    "context": {
        "source": input.source,
        "target": input.target,
        "resource": input.resource,
        "actor": input.actor
    },
    "timestamp": time.now_ns()
}

# =============================================================================
# HELPER RULES FOR TESTING
# =============================================================================

# Test if specific barrier is clear
test_tenant_barrier := tenant_isolated
test_bu_barrier := bu_barrier_clear
test_role_barrier := role_barrier_clear
test_env_barrier := env_barrier_clear
test_jurisdiction_barrier := jurisdiction_barrier_clear
