# CompanyOS Release Gate Policy
# Enforces release gates for all deployments
#
# Usage:
#   opa eval -d release_gate.rego -i input.json "data.companyos.release.decision"
#
# Input schema:
#   {
#     "service": "api",
#     "version": "1.2.3",
#     "environment": "production",
#     "gates": { ... },
#     "slo": { ... },
#     "emergency_override": false
#   }

package companyos.release

import future.keywords.in
import future.keywords.if
import future.keywords.contains

# ============================================================================
# Default Deny
# ============================================================================

default allow := false
default emergency_mode := false

# ============================================================================
# Service Classification
# ============================================================================

tier1_services := {
    "api",
    "graphql-gateway",
    "neo4j",
    "copilot",
    "postgres",
    "redis",
}

tier2_services := {
    "conductor",
    "audit-svc",
    "prov-ledger",
    "worker-ingest",
    "worker-analysis",
    "websocket-server",
}

tier3_services := {
    "devtools",
    "docs",
    "sandbox",
    "test-runner",
}

# ============================================================================
# Main Decision Logic
# ============================================================================

# Standard deployment path
allow if {
    not emergency_mode
    all_build_gates_pass
    all_quality_gates_pass
    all_security_gates_pass
    slo_gates_satisfied
    policy_gates_satisfied
    deployment_window_valid
    not deployment_freeze_active
}

# Emergency override path
allow if {
    emergency_mode
    valid_emergency_override
}

# Tier 3 services have relaxed requirements
allow if {
    input.service in tier3_services
    all_build_gates_pass
    basic_quality_gates_pass
    no_critical_security_issues
}

# ============================================================================
# Build Gates
# ============================================================================

all_build_gates_pass if {
    input.gates.build.typescript == "pass"
    input.gates.build.compile == "pass"
    input.gates.build.lint == "pass"
    input.gates.build.format == "pass"
}

# ============================================================================
# Quality Gates
# ============================================================================

all_quality_gates_pass if {
    input.gates.quality.unit_tests == "pass"
    input.gates.quality.coverage >= min_coverage_threshold
    input.gates.quality.integration_tests == "pass"
    golden_path_satisfied
}

basic_quality_gates_pass if {
    input.gates.quality.unit_tests == "pass"
    input.gates.quality.coverage >= 60
}

# Coverage thresholds by tier
min_coverage_threshold := 80 if { input.service in tier1_services }
min_coverage_threshold := 70 if { input.service in tier2_services }
min_coverage_threshold := 60 if { input.service in tier3_services }

# Golden path is required for Tier 1 and 2
golden_path_satisfied if {
    input.gates.quality.golden_path == "pass"
}

golden_path_satisfied if {
    input.service in tier3_services
}

# ============================================================================
# Security Gates
# ============================================================================

all_security_gates_pass if {
    no_critical_security_issues
    no_high_security_issues_in_production
    secrets_scan_clean
    container_security_verified
}

no_critical_security_issues if {
    input.gates.security.critical_cves == 0
}

no_high_security_issues_in_production if {
    input.environment != "production"
}

no_high_security_issues_in_production if {
    input.environment == "production"
    input.gates.security.high_cves == 0
}

secrets_scan_clean if {
    input.gates.security.secrets_found == 0
}

container_security_verified if {
    input.gates.security.image_signed == true
    input.gates.security.slsa_level >= min_slsa_level
}

# SLSA requirements by environment
min_slsa_level := 3 if { input.environment == "production" }
min_slsa_level := 2 if { input.environment == "staging" }
min_slsa_level := 1 if { input.environment == "development" }

# ============================================================================
# SLO Gates
# ============================================================================

slo_gates_satisfied if {
    error_budget_sufficient
    burn_rate_acceptable
    no_active_incidents
    recent_rollback_count_acceptable
}

error_budget_sufficient if {
    input.slo.error_budget_remaining >= min_error_budget
}

# Budget thresholds - more restrictive for Tier 1
min_error_budget := 30 if { input.service in tier1_services }
min_error_budget := 20 if { input.service in tier2_services }
min_error_budget := 10 if { input.service in tier3_services }

burn_rate_acceptable if {
    input.slo.fast_burn_rate < 2.0
    input.slo.slow_burn_rate < 1.0
}

no_active_incidents if {
    input.slo.active_p1_incidents == 0
    input.slo.active_p2_incidents == 0
}

no_active_incidents if {
    input.service in tier3_services
    input.slo.active_p1_incidents == 0
}

recent_rollback_count_acceptable if {
    input.slo.rollbacks_last_24h < 2
}

# ============================================================================
# Policy Gates
# ============================================================================

policy_gates_satisfied if {
    image_from_trusted_registry
    abac_validated
}

image_from_trusted_registry if {
    some registry in data.trusted_registries
    startswith(input.image, registry)
}

# Default trusted registries if not provided
image_from_trusted_registry if {
    not data.trusted_registries
    startswith(input.image, "ghcr.io/brianclong/summit/")
}

image_from_trusted_registry if {
    startswith(input.image, "registry.intelgraph.local/")
}

abac_validated if {
    input.gates.policy.abac_check == "pass"
}

abac_validated if {
    not input.gates.policy.abac_check
}

# ============================================================================
# Deployment Windows
# ============================================================================

deployment_window_valid if {
    deployment_window_open
}

deployment_window_valid if {
    input.environment != "production"
}

deployment_window_open if {
    current_time := time.now_ns()
    current_hour := time.clock(current_time)[0]
    current_weekday := time.weekday(current_time)

    # Monday through Thursday, 09:00-16:00
    current_weekday in ["Monday", "Tuesday", "Wednesday", "Thursday"]
    current_hour >= 9
    current_hour < 16
}

# Friday morning allowed for low-risk changes
deployment_window_open if {
    current_time := time.now_ns()
    current_hour := time.clock(current_time)[0]
    current_weekday := time.weekday(current_time)

    current_weekday == "Friday"
    current_hour >= 9
    current_hour < 12
    not input.service in tier1_services
}

# ============================================================================
# Deployment Freezes
# ============================================================================

deployment_freeze_active if {
    some freeze in data.active_freezes
    current_time := time.now_ns()
    current_time >= freeze.start_ns
    current_time < freeze.end_ns
    not freeze_exception_granted(freeze)
}

freeze_exception_granted(freeze) if {
    input.freeze_exception.freeze_id == freeze.id
    input.freeze_exception.approved == true
    input.freeze_exception.approver in data.freeze_exception_approvers
}

# ============================================================================
# Emergency Override
# ============================================================================

emergency_mode if {
    input.emergency_override == true
}

valid_emergency_override if {
    input.emergency_override == true
    input.override_approver in data.authorized_overriders
    input.incident_id != ""
    input.override_reason != ""
}

# Default authorized overriders if not provided
valid_emergency_override if {
    input.emergency_override == true
    input.override_approver in {"sre-lead", "vp-engineering", "cto"}
    input.incident_id != ""
}

# ============================================================================
# Deployment Strategy Selection
# ============================================================================

recommended_strategy := "progressive-canary" if {
    input.service in tier1_services
    input.environment == "production"
}

recommended_strategy := "standard-canary" if {
    input.service in tier2_services
    input.environment == "production"
}

recommended_strategy := "blue-green" if {
    input.has_database_migration == true
}

recommended_strategy := "rolling" if {
    input.service in tier3_services
}

recommended_strategy := "rolling" if {
    input.environment in {"development", "staging"}
}

# ============================================================================
# Canary Configuration
# ============================================================================

canary_steps := [
    {"weight": 1, "pause": "60s", "analysis": ["smoke-check"]},
    {"weight": 10, "pause": "300s", "analysis": ["slo-burn-check", "error-budget-check"]},
    {"weight": 25, "pause": "600s", "analysis": ["slo-burn-check", "synthetic-check"]},
    {"weight": 50, "pause": "900s", "analysis": ["slo-burn-check", "anomaly-check"]},
    {"weight": 100, "pause": "0s", "analysis": []},
] if {
    input.service in tier1_services
}

canary_steps := [
    {"weight": 10, "pause": "120s", "analysis": ["quick-health-check"]},
    {"weight": 50, "pause": "180s", "analysis": ["slo-burn-check"]},
    {"weight": 100, "pause": "0s", "analysis": []},
] if {
    input.service in tier2_services
}

# ============================================================================
# Decision Output
# ============================================================================

decision := {
    "allow": allow,
    "timestamp": time.now_ns(),
    "service": input.service,
    "version": input.version,
    "environment": input.environment,
    "strategy": recommended_strategy,
    "canary_config": canary_steps,
    "gates": {
        "build": all_build_gates_pass,
        "quality": all_quality_gates_pass,
        "security": all_security_gates_pass,
        "slo": slo_gates_satisfied,
        "policy": policy_gates_satisfied,
        "window": deployment_window_valid,
        "freeze": not deployment_freeze_active,
    },
    "emergency": {
        "mode": emergency_mode,
        "valid": valid_emergency_override,
        "approver": input.override_approver,
        "incident_id": input.incident_id,
    },
    "violations": violation,
    "warnings": warning,
}

# ============================================================================
# Violation Messages
# ============================================================================

violation contains msg if {
    not all_build_gates_pass
    msg := "Build gates not satisfied - check TypeScript, lint, and format"
}

violation contains msg if {
    not input.gates.quality.unit_tests == "pass"
    msg := "Unit tests failed"
}

violation contains msg if {
    input.gates.quality.coverage < min_coverage_threshold
    msg := sprintf("Code coverage %d%% is below required %d%%", [input.gates.quality.coverage, min_coverage_threshold])
}

violation contains msg if {
    input.gates.quality.golden_path != "pass"
    not input.service in tier3_services
    msg := "Golden path smoke test failed"
}

violation contains msg if {
    input.gates.security.critical_cves > 0
    msg := sprintf("%d critical CVE(s) detected - deployment blocked", [input.gates.security.critical_cves])
}

violation contains msg if {
    input.environment == "production"
    input.gates.security.high_cves > 0
    msg := sprintf("%d high CVE(s) detected - blocked in production", [input.gates.security.high_cves])
}

violation contains msg if {
    input.gates.security.secrets_found > 0
    msg := sprintf("%d secret(s) detected in code", [input.gates.security.secrets_found])
}

violation contains msg if {
    input.gates.security.image_signed != true
    input.environment == "production"
    msg := "Container image is not signed - required for production"
}

violation contains msg if {
    input.gates.security.slsa_level < min_slsa_level
    msg := sprintf("SLSA level %d is below required level %d", [input.gates.security.slsa_level, min_slsa_level])
}

violation contains msg if {
    input.slo.error_budget_remaining < min_error_budget
    msg := sprintf("Error budget at %d%% (minimum %d%% required)", [input.slo.error_budget_remaining, min_error_budget])
}

violation contains msg if {
    input.slo.fast_burn_rate >= 2.0
    msg := sprintf("Fast burn rate %.2f exceeds threshold 2.0", [input.slo.fast_burn_rate])
}

violation contains msg if {
    input.slo.active_p1_incidents > 0
    msg := sprintf("%d active P1 incident(s) - resolve before deploying", [input.slo.active_p1_incidents])
}

violation contains msg if {
    input.slo.rollbacks_last_24h >= 2
    msg := sprintf("%d rollbacks in last 24h - investigate stability", [input.slo.rollbacks_last_24h])
}

violation contains msg if {
    input.environment == "production"
    not deployment_window_open
    not emergency_mode
    msg := "Outside deployment window (Mon-Thu 09:00-16:00, Fri 09:00-12:00 for non-Tier1)"
}

violation contains msg if {
    deployment_freeze_active
    msg := "Deployment freeze is active"
}

violation contains msg if {
    emergency_mode
    not valid_emergency_override
    msg := "Emergency override requested but not valid - requires approver, incident ID, and reason"
}

# ============================================================================
# Warning Messages
# ============================================================================

warning contains msg if {
    input.slo.error_budget_remaining < 50
    input.slo.error_budget_remaining >= min_error_budget
    msg := sprintf("Error budget at %d%% - proceed with caution", [input.slo.error_budget_remaining])
}

warning contains msg if {
    input.slo.slow_burn_rate >= 0.5
    input.slo.slow_burn_rate < 1.0
    msg := sprintf("Elevated slow burn rate %.2f - monitor closely", [input.slo.slow_burn_rate])
}

warning contains msg if {
    input.environment != "production"
    input.gates.security.high_cves > 0
    msg := sprintf("%d high CVE(s) detected - fix before production", [input.gates.security.high_cves])
}

warning contains msg if {
    time.weekday(time.now_ns()) == "Friday"
    input.service in tier1_services
    msg := "Friday deployment of Tier 1 service - consider waiting until Monday"
}

warning contains msg if {
    input.slo.rollbacks_last_24h == 1
    msg := "1 rollback in last 24h - ensure this deployment is well-tested"
}
