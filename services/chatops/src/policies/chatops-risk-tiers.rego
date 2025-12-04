# ChatOps Risk Tier Classification Policy
#
# This OPA policy defines risk classification for ChatOps operations:
# - autonomous: Low-risk, execute immediately
# - hitl: Moderate risk, requires human approval
# - prohibited: High-risk, blocked entirely
#
# Factors considered:
# - Operation type
# - Data classification level
# - User clearance level
# - Data volume (bulk operations)
# - Cross-tenant access
# - Time-based restrictions

package chatops.risk

import future.keywords.in

# Default to requiring HITL for unknown operations
default risk_level := "hitl"

# =============================================================================
# AUTONOMOUS OPERATIONS (LOW RISK)
# =============================================================================

# Graph read operations
risk_level := "autonomous" {
    input.operation in ["read", "query", "lookup", "search"]
    input.tool_id in ["graph", "entity", "relationship", "path"]
}

# Summary and analysis operations
risk_level := "autonomous" {
    input.operation in ["summarize", "analyze", "translate"]
}

# NL2Cypher translation (read-only)
risk_level := "autonomous" {
    input.tool_id == "nl2cypher"
    input.operation == "translate"
}

# Entity lookup
risk_level := "autonomous" {
    input.tool_id == "entity"
    input.operation in ["lookup", "search", "neighbors"]
}

# Path finding
risk_level := "autonomous" {
    input.tool_id == "path"
    input.operation in ["find", "shortest", "all"]
}

# =============================================================================
# HITL OPERATIONS (MODERATE RISK)
# =============================================================================

# Graph write operations
risk_level := "hitl" {
    input.operation in ["create", "update", "modify"]
    input.tool_id in ["graph", "entity", "relationship"]
}

# Alert creation
risk_level := "hitl" {
    input.tool_id == "alert"
    input.operation in ["create", "update"]
}

# Report generation
risk_level := "hitl" {
    input.tool_id == "report"
    input.operation == "generate"
}

# Data export (non-bulk)
risk_level := "hitl" {
    input.tool_id == "data"
    input.operation == "export"
    input.record_count <= 1000
}

# External API calls
risk_level := "hitl" {
    input.tool_id == "external"
}

# Operations on classified data
risk_level := "hitl" {
    input.data_classification in ["SECRET", "TOP_SECRET"]
    input.operation in ["read", "query"]
}

# Operations outside business hours (for sensitive data)
risk_level := "hitl" {
    input.data_classification in ["CONFIDENTIAL", "SECRET", "TOP_SECRET"]
    not within_business_hours
}

# =============================================================================
# PROHIBITED OPERATIONS (HIGH RISK)
# =============================================================================

# Delete operations
risk_level := "prohibited" {
    input.operation in ["delete", "remove", "purge"]
}

# Bulk delete
risk_level := "prohibited" {
    input.operation == "bulk_delete"
}

# Cross-tenant access
risk_level := "prohibited" {
    input.tenant_id != input.user_tenant_id
    not has_cross_tenant_permission
}

# Policy override attempts
risk_level := "prohibited" {
    input.operation == "policy_override"
}

# Classification downgrade
risk_level := "prohibited" {
    input.operation == "downgrade_classification"
}

# PII access without clearance
risk_level := "prohibited" {
    input.contains_pii == true
    not has_pii_access
}

# Bulk data export
risk_level := "prohibited" {
    input.tool_id == "data"
    input.operation == "export"
    input.record_count > 1000
}

# Operations on TOP_SECRET_SCI without compartment access
risk_level := "prohibited" {
    input.data_classification == "TOP_SECRET_SCI"
    not has_compartment_access
}

# Administrative operations
risk_level := "prohibited" {
    input.operation in ["admin", "configure", "reset"]
    not is_admin
}

# =============================================================================
# CLEARANCE CHECKS
# =============================================================================

# Clearance level hierarchy
clearance_levels := {
    "UNCLASSIFIED": 0,
    "CUI": 1,
    "CONFIDENTIAL": 2,
    "SECRET": 3,
    "TOP_SECRET": 4,
    "TOP_SECRET_SCI": 5
}

# User has sufficient clearance
sufficient_clearance {
    user_level := clearance_levels[input.user_clearance]
    data_level := clearance_levels[input.data_classification]
    user_level >= data_level
}

# Block if clearance insufficient
risk_level := "prohibited" {
    not sufficient_clearance
}

# =============================================================================
# HELPER RULES
# =============================================================================

# Check if within business hours (6:00-22:00 UTC)
within_business_hours {
    hour := time.clock([time.now_ns(), "UTC"])[0]
    hour >= 6
    hour < 22
}

# Check for cross-tenant permission
has_cross_tenant_permission {
    "cross_tenant:access" in input.user_permissions
}

# Check for PII access permission
has_pii_access {
    "pii:access" in input.user_permissions
}

# Check for compartment access
has_compartment_access {
    input.required_compartments[_] in input.user_compartments
}

# Check if user is admin
is_admin {
    "admin" in input.user_roles
}

# =============================================================================
# APPROVAL REQUIREMENTS
# =============================================================================

# Number of approvals required for HITL operations
required_approvals := count {
    risk_level == "hitl"
    count := 1
}

required_approvals := count {
    risk_level == "hitl"
    input.data_classification in ["SECRET", "TOP_SECRET"]
    count := 2
}

required_approvals := count {
    risk_level == "hitl"
    input.data_classification == "TOP_SECRET_SCI"
    count := 3
}

# Roles that can approve
approver_roles := roles {
    risk_level == "hitl"
    input.data_classification in ["UNCLASSIFIED", "CUI", "CONFIDENTIAL"]
    roles := ["supervisor", "analyst", "admin"]
}

approver_roles := roles {
    risk_level == "hitl"
    input.data_classification in ["SECRET", "TOP_SECRET"]
    roles := ["supervisor", "security_officer", "admin"]
}

approver_roles := roles {
    risk_level == "hitl"
    input.data_classification == "TOP_SECRET_SCI"
    roles := ["security_officer", "admin"]
}

# =============================================================================
# AUDIT REQUIREMENTS
# =============================================================================

# Operations requiring audit
requires_audit {
    risk_level in ["hitl", "prohibited"]
}

requires_audit {
    input.data_classification in ["SECRET", "TOP_SECRET", "TOP_SECRET_SCI"]
}

requires_audit {
    input.operation in ["export", "delete", "modify"]
}

# Audit retention period (days)
audit_retention := days {
    input.data_classification == "UNCLASSIFIED"
    days := 90
}

audit_retention := days {
    input.data_classification in ["CUI", "CONFIDENTIAL"]
    days := 365
}

audit_retention := days {
    input.data_classification in ["SECRET", "TOP_SECRET"]
    days := 2555  # 7 years
}

audit_retention := days {
    input.data_classification == "TOP_SECRET_SCI"
    days := 9125  # 25 years
}

# =============================================================================
# RATE LIMITING
# =============================================================================

# Operations per hour by role
rate_limit := limit {
    "viewer" in input.user_roles
    limit := 100
}

rate_limit := limit {
    "analyst" in input.user_roles
    limit := 500
}

rate_limit := limit {
    "supervisor" in input.user_roles
    limit := 1000
}

rate_limit := limit {
    "admin" in input.user_roles
    limit := 5000
}

# =============================================================================
# OUTPUT
# =============================================================================

# Full decision output
decision := {
    "risk_level": risk_level,
    "required_approvals": required_approvals,
    "approver_roles": approver_roles,
    "requires_audit": requires_audit,
    "audit_retention_days": audit_retention,
    "rate_limit": rate_limit,
    "reason": reason
}

# Decision reason
reason := msg {
    risk_level == "autonomous"
    msg := "Low-risk operation, executing immediately"
}

reason := msg {
    risk_level == "hitl"
    msg := sprintf("Moderate-risk operation, requires %d approval(s)", [required_approvals])
}

reason := msg {
    risk_level == "prohibited"
    not sufficient_clearance
    msg := sprintf("Insufficient clearance: user has %s, data requires %s", [input.user_clearance, input.data_classification])
}

reason := msg {
    risk_level == "prohibited"
    input.operation in ["delete", "bulk_delete"]
    msg := "Delete operations are prohibited"
}

reason := msg {
    risk_level == "prohibited"
    input.tenant_id != input.user_tenant_id
    msg := "Cross-tenant access is prohibited without explicit permission"
}

reason := msg {
    risk_level == "prohibited"
    msg := "Operation is prohibited by policy"
}
