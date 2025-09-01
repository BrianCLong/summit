# IntelGraph Autonomous Orchestrator - OPA/Rego Policy Definitions
# Implements comprehensive policy rules for action authorization and safety gates
# Version: 1.0.0

package orchestrator

import future.keywords.every
import future.keywords.in

# Main authorization decision
allow {
    not deny
    not high_risk_action_without_approval
    budget_check
    time_restriction_check
    safety_check
    security_check
}

# Explicit deny rules take precedence
deny {
    blocked_action
}

deny {
    exceeded_autonomy_limit
}

deny {
    missing_required_reason
}

deny {
    production_action_without_approval
}

# High risk actions that require approval
high_risk_action_without_approval {
    input.context.autonomy_level >= 4
    not has_approval
}

high_risk_action_without_approval {
    input.action.category in ["DEPLOY", "ROLLBACK"]
    input.context.environment == "production"
    not has_approval
}

high_risk_action_without_approval {
    estimated_cost > 50.0
    not has_approval
}

# Budget enforcement
budget_check {
    input.context.budget_remaining >= 0
}

budget_check {
    input.action.category == "READ"
    input.context.budget_remaining >= -10.0  # Allow small overruns for read operations
}

# Time-based restrictions
time_restriction_check {
    not restricted_hours
}

time_restriction_check {
    input.context.environment != "production"
}

restricted_hours {
    # Production deployments only allowed during business hours
    input.action.category in ["DEPLOY", "ROLLBACK"]
    input.context.environment == "production"
    current_hour := time.now_ns() / 1000000000 / 3600 % 24
    not current_hour in range(9, 17)  # 9 AM to 5 PM
}

# Safety checks
safety_check {
    not dangerous_action_combination
    not excessive_resource_usage
    not suspicious_pattern
}

dangerous_action_combination {
    input.action.type == "delete_production_data"
    input.context.autonomy_level > 2
}

dangerous_action_combination {
    input.action.type == "external_api_call"
    input.action.params.url
    contains(input.action.params.url, "internal")
}

dangerous_action_combination {
    input.action.type == "execute_code"
    contains(input.action.params.code, "rm -rf")
}

excessive_resource_usage {
    input.action.type == "compute_intensive_task"
    input.action.params.cpu_cores > 16
}

excessive_resource_usage {
    input.action.type == "data_processing"
    input.action.params.memory_gb > 64
}

suspicious_pattern {
    # Multiple high-autonomy actions in short timeframe
    input.context.autonomy_level >= 4
    recent_high_autonomy_actions >= 5
}

# Security checks
security_check {
    not security_violation
    authorized_user
    valid_tenant_access
}

security_violation {
    # Check for potential SSRF
    input.action.type == "fetch_url"
    input.action.params.url
    suspicious_url(input.action.params.url)
}

security_violation {
    # Check for potential code injection
    input.action.type == "execute_query"
    input.action.params.query
    contains(input.action.params.query, ";--")
}

security_violation {
    # Check for sensitive data access
    input.action.type == "read_secrets"
    not input.subject.roles[_] == "admin"
}

suspicious_url(url) {
    contains(url, "127.0.0.1")
}

suspicious_url(url) {
    contains(url, "localhost")
}

suspicious_url(url) {
    contains(url, "10.")
}

suspicious_url(url) {
    contains(url, "192.168.")
}

suspicious_url(url) {
    contains(url, "169.254.")
}

# User authorization
authorized_user {
    input.subject.user_id != ""
    input.subject.tenant_id != ""
}

valid_tenant_access {
    input.resource.attributes.tenant_id == input.subject.tenant_id
}

valid_tenant_access {
    # Admin users can access cross-tenant resources
    input.subject.roles[_] == "admin"
}

# Helper functions
blocked_action {
    applicable_rule := input.applicable_rules[_]
    applicable_rule.category == "SAFETY"
    applicable_rule.conditions.blocked_actions[_] == input.action.type
}

exceeded_autonomy_limit {
    applicable_rule := input.applicable_rules[_]
    applicable_rule.category == "SAFETY"
    applicable_rule.conditions.max_autonomy_level < input.context.autonomy_level
}

missing_required_reason {
    input.action.category in ["WRITE", "DEPLOY", "ROLLBACK"]
    input.context.autonomy_level >= 3
    not input.context.reason_for_access
}

missing_required_reason {
    input.action.category in ["WRITE", "DEPLOY", "ROLLBACK"]
    input.context.reason_for_access == ""
}

production_action_without_approval {
    input.action.category in ["DEPLOY", "ROLLBACK"]
    input.context.environment == "production"
    not has_approval
}

has_approval {
    # Check if approval is present in context
    input.context.approved_by
    input.context.approval_status == "APPROVED"
}

estimated_cost = cost {
    cost := object.get(input.action.params, "estimated_cost", 0.0)
}

recent_high_autonomy_actions = count {
    # This would typically query historical data
    # For now, return 0 as placeholder
    count := 0
}

# Specific policy rules based on action types

# Code execution policies
allow_code_execution {
    input.action.type == "execute_code"
    input.context.autonomy_level <= 2
    safe_code_execution
}

safe_code_execution {
    not contains(input.action.params.code, "rm ")
    not contains(input.action.params.code, "sudo")
    not contains(input.action.params.code, "curl")
    not contains(input.action.params.code, "wget")
}

# Database access policies
allow_database_write {
    input.action.type == "database_write"
    input.context.environment != "production"
}

allow_database_write {
    input.action.type == "database_write"
    input.context.environment == "production"
    input.context.autonomy_level <= 1
    has_approval
}

# File system policies
allow_file_write {
    input.action.type == "file_write"
    safe_file_path(input.action.params.path)
    input.action.params.size_bytes < 10485760  # 10MB limit
}

safe_file_path(path) {
    not startswith(path, "/etc/")
    not startswith(path, "/root/")
    not startswith(path, "/boot/")
    not startswith(path, "/sys/")
    not startswith(path, "/proc/")
}

# Network access policies
allow_network_request {
    input.action.type == "http_request"
    allowed_domain(input.action.params.url)
    safe_http_method(input.action.params.method)
}

allowed_domain(url) {
    # Extract domain and check against allowlist
    contains(url, "api.intelgraph.ai")
}

allowed_domain(url) {
    contains(url, "github.com")
}

allowed_domain(url) {
    contains(url, "pypi.org")
}

safe_http_method(method) {
    method in ["GET", "HEAD", "OPTIONS"]
}

safe_http_method(method) {
    method in ["POST", "PUT", "PATCH", "DELETE"]
    input.context.autonomy_level <= 2
}

# Budget-specific policies
budget_approval_required {
    estimated_cost > 25.0
    input.context.autonomy_level >= 3
}

budget_hard_limit {
    estimated_cost > 100.0
}

# Time-based policies for different environments
business_hours_only {
    input.context.environment == "production"
    input.action.category in ["DEPLOY", "ROLLBACK"]
}

maintenance_window_only {
    input.action.type == "system_maintenance"
    input.context.environment == "production"
    # Check if current time is within maintenance window
    # This would need to be implemented with actual time logic
}

# Compliance and audit requirements
audit_log_required {
    input.action.category in ["WRITE", "DEPLOY", "ROLLBACK"]
    input.context.autonomy_level >= 2
}

retention_policy_check {
    input.action.type == "delete_data"
    # Ensure data retention policies are met
    input.action.params.data_age_days >= 90
}

# Emergency procedures
emergency_override {
    input.context.emergency_mode == true
    input.subject.roles[_] == "incident_commander"
    input.context.incident_id != ""
}

kill_switch_active {
    # Check if kill switch is activated
    data.orchestrator.kill_switch_status == "ACTIVE"
}

# Final decision with detailed reasoning
decision := {
    "allow": allow,
    "deny": deny,
    "reason": reason,
    "obligations": obligations,
    "metadata": {
        "evaluated_at": time.now_ns(),
        "autonomy_level": input.context.autonomy_level,
        "estimated_cost": estimated_cost,
        "environment": input.context.environment,
        "requires_approval": requires_approval,
        "budget_check": budget_check,
        "safety_violations": safety_violations
    }
}

reason := msg {
    deny
    msg := "Action denied by policy"
}

reason := msg {
    high_risk_action_without_approval
    msg := "High risk action requires approval"
}

reason := msg {
    not budget_check
    msg := "Budget limit exceeded"
}

reason := msg {
    not time_restriction_check
    msg := "Action not allowed during current time window"
}

reason := msg {
    not safety_check
    msg := "Safety check failed"
}

reason := msg {
    not security_check
    msg := "Security check failed"
}

reason := msg {
    allow
    msg := "Action permitted by policy"
}

obligations := obs {
    obs := array.concat(
        approval_obligations,
        audit_obligations
    )
}

approval_obligations := obs {
    requires_approval
    obs := ["REQUIRE_APPROVAL"]
}

approval_obligations := obs {
    not requires_approval
    obs := []
}

audit_obligations := obs {
    audit_log_required
    obs := ["AUDIT_REQUIRED"]
}

audit_obligations := obs {
    not audit_log_required
    obs := []
}

requires_approval {
    high_risk_action_without_approval
}

requires_approval {
    budget_approval_required
}

requires_approval {
    production_action_without_approval
}

safety_violations := violations {
    violations := [v |
        dangerous_action_combination
        v := "dangerous_action_combination"
    ]
}

# Utility functions
range(start, end) = numbers {
    numbers := [i | i := start + x; x := numbers.number[_]; x < end - start]
}

# Helper for string operations
startswith(string, prefix) {
    string == prefix
}

startswith(string, prefix) {
    count(prefix) <= count(string)
    substring(string, 0, count(prefix)) == prefix
}