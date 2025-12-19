# Summit Release Policy - Production-grade OPA rules for Release Captain
# Enforces risk-based quality gates and governance controls

package summit.release

import future.keywords.if
import future.keywords.in

# Default deny - must explicitly allow
default allow = false

# Risk assessment mapping
risk_levels := {"LOW": 0, "MEDIUM": 1, "HIGH": 2}

# Protected paths requiring elevated review
protected_paths := [
    ".github/workflows/",
    "charts/ig-platform/values.yaml",
    "services/*/migrations/",
    "RUNBOOKS/",
    "tools/backup/",
    "tools/deployment/",
    "services/api-gateway/src/auth/",
    "services/license-registry/",
    "ops/observability/",
    "scripts/github/"
]

# Critical service paths that affect production
critical_services := [
    "services/api-gateway/",
    "services/graph-xai/",
    "services/prov-ledger/",
    "services/license-registry/",
    "services/feed-processor/"
]

# High-risk change patterns
high_risk_patterns := [
    "auth/",
    "migration",
    "schema",
    "secret",
    "password",
    "token",
    "key",
    "security",
    "rbac",
    "permissions"
]

# =============================================================================
# MAIN ALLOW RULE
# =============================================================================

allow if {
    not draft_pr
    mergeable_state
    all_quality_gates_pass
    no_policy_violations
    risk_within_limits
    required_approvals_met
}

# Emergency bypass for critical production fixes
allow if {
    emergency_override
    minimal_emergency_changes
    critical_path_only
}

# =============================================================================
# QUALITY GATES
# =============================================================================

all_quality_gates_pass if {
    input.quality_gates.build == true
    input.quality_gates.typecheck == true
    input.quality_gates.lint == true
    input.quality_gates.tests == true
    input.quality_gates.security == true
}

# Additional gates for medium risk
all_quality_gates_pass if {
    assessed_risk == "MEDIUM"
    input.quality_gates.integration_tests == true
    input.quality_gates.dependency_audit == true
}

# Additional gates for high risk
all_quality_gates_pass if {
    assessed_risk == "HIGH"
    input.quality_gates.e2e == true
    input.quality_gates.contract_tests == true
    input.quality_gates.migration_plan == true
    input.quality_gates.performance_smoke == true
}

# =============================================================================
# RISK ASSESSMENT
# =============================================================================

assessed_risk := "HIGH" if {
    high_risk_conditions
}

assessed_risk := "MEDIUM" if {
    not high_risk_conditions
    medium_risk_conditions
}

assessed_risk := "LOW" if {
    not high_risk_conditions
    not medium_risk_conditions
}

high_risk_conditions if {
    touches_critical_infrastructure
}

high_risk_conditions if {
    has_database_migrations
}

high_risk_conditions if {
    touches_authentication_system
}

high_risk_conditions if {
    large_change_volume
}

high_risk_conditions if {
    touches_multiple_services
}

medium_risk_conditions if {
    touches_backend_services
}

medium_risk_conditions if {
    has_dependency_changes
}

medium_risk_conditions if {
    touches_configuration
}

# =============================================================================
# SPECIFIC RISK DETECTORS
# =============================================================================

touches_critical_infrastructure if {
    some file in input.changed_files
    some pattern in protected_paths
    startswith(file.path, pattern)
}

has_database_migrations if {
    some file in input.changed_files
    contains(file.path, "migration")
}

touches_authentication_system if {
    some file in input.changed_files
    some pattern in high_risk_patterns
    contains(file.path, pattern)
}

large_change_volume if {
    count(input.changed_files) > 20
}

touches_multiple_services if {
    count({service |
        some file in input.changed_files
        some service_path in critical_services
        startswith(file.path, service_path)
        service := service_path
    }) > 2
}

touches_backend_services if {
    some file in input.changed_files
    startswith(file.path, "services/")
    not contains(file.path, "test")
}

has_dependency_changes if {
    some file in input.changed_files
    contains(file.path, "package.json")
}

touches_configuration if {
    some file in input.changed_files
    contains(file.path, "config")
}

# =============================================================================
# APPROVAL REQUIREMENTS
# =============================================================================

required_approvals_met if {
    assessed_risk == "LOW"
    basic_approval_requirements
}

required_approvals_met if {
    assessed_risk == "MEDIUM"
    basic_approval_requirements
    codeowners_approved
}

required_approvals_met if {
    assessed_risk == "HIGH"
    basic_approval_requirements
    codeowners_approved
    elevated_approval_requirements
}

basic_approval_requirements if {
    input.pr.approvals >= 1
    not input.pr.changes_requested
}

codeowners_approved if {
    not requires_codeowner_review
}

codeowners_approved if {
    requires_codeowner_review
    input.pr.codeowner_approved == true
}

elevated_approval_requirements if {
    input.pr.approvals >= 2
    input.pr.owner_approved == true
}

requires_codeowner_review if {
    some file in input.changed_files
    some path in protected_paths
    startswith(file.path, path)
}

# =============================================================================
# POLICY VIOLATIONS
# =============================================================================

# Collect all policy violations
violations[violation] {
    missing_tests
    violation := {
        "type": "missing_tests",
        "severity": "high",
        "message": "Application code changed without corresponding tests",
        "remediation": "Add test files for modified functionality"
    }
}

violations[violation] {
    hardcoded_secrets
    violation := {
        "type": "hardcoded_secrets",
        "severity": "critical",
        "message": "Potential hardcoded secrets detected in code",
        "remediation": "Remove secrets and use environment variables or secret management"
    }
}

violations[violation] {
    breaking_api_changes
    violation := {
        "type": "breaking_changes",
        "severity": "high",
        "message": "Breaking API changes detected without proper versioning",
        "remediation": "Use API versioning or feature flags for breaking changes"
    }
}

violations[violation] {
    unauthorized_protected_changes
    violation := {
        "type": "unauthorized_changes",
        "severity": "critical",
        "message": "Changes to protected paths without required approvals",
        "remediation": "Get approval from designated code owners"
    }
}

violations[violation] {
    unsafe_migration_pattern
    violation := {
        "type": "unsafe_migration",
        "severity": "high",
        "message": "Database migration does not follow expand-migrate-contract pattern",
        "remediation": "Ensure migrations are reversible and follow safe deployment patterns"
    }
}

# =============================================================================
# VIOLATION DETECTORS
# =============================================================================

missing_tests if {
    has_application_code_changes
    not has_test_changes
    not test_exemption_approved
}

has_application_code_changes if {
    some file in input.changed_files
    startswith(file.path, "src/")
    not contains(file.path, "test")
}

has_application_code_changes if {
    some file in input.changed_files
    startswith(file.path, "services/")
    endswith(file.path, ".ts")
    not contains(file.path, "test")
}

has_test_changes if {
    some file in input.changed_files
    test_file_pattern(file.path)
}

test_file_pattern(path) if {
    contains(path, "test")
}

test_file_pattern(path) if {
    contains(path, "spec")
}

test_file_pattern(path) if {
    contains(path, "__tests__")
}

hardcoded_secrets if {
    some file in input.changed_files
    file.patch
    secret_pattern_match(file.patch)
}

secret_pattern_match(patch) if {
    regex.match(`password\s*[:=]\s*['""][^'""]+['""]`, patch)
}

secret_pattern_match(patch) if {
    regex.match(`api[_-]?key\s*[:=]\s*['""][^'""]+['""]`, patch)
}

secret_pattern_match(patch) if {
    regex.match(`secret\s*[:=]\s*['""][^'""]+['""]`, patch)
}

secret_pattern_match(patch) if {
    regex.match(`token\s*[:=]\s*['""][^'""]+['""]`, patch)
}

breaking_api_changes if {
    has_graphql_schema_changes
    not has_api_versioning
}

default removes_endpoints = false

breaking_api_changes if {
    has_rest_api_changes
    removes_endpoints
}

has_graphql_schema_changes if {
    some file in input.changed_files
    contains(file.path, "graphql")
    contains(file.path, "schema")
}

has_rest_api_changes if {
    some file in input.changed_files
    contains(file.path, "routes")
    contains(file.path, "api")
}

unauthorized_protected_changes if {
    touches_critical_infrastructure
    not codeowners_approved
}

unsafe_migration_pattern if {
    has_database_migrations
    not follows_safe_migration_pattern
}

# =============================================================================
# STATE CHECKS
# =============================================================================

draft_pr if {
    input.pr.draft == true
}

mergeable_state if {
    input.pr.mergeable == true
    input.pr.mergeable_state == "clean"
}

risk_within_limits if {
    risk_levels[assessed_risk] <= risk_levels[input.max_allowed_risk]
}

no_policy_violations if {
    count(violations) == 0
}

# =============================================================================
# EMERGENCY OVERRIDE
# =============================================================================

emergency_override if {
    input.pr.labels[_] == "emergency-hotfix"
    input.pr.author in ["BrianCLong", "platform-team", "sre-team"]
    input.emergency_approval == true
}

minimal_emergency_changes if {
    count(input.changed_files) <= 5
}

critical_path_only if {
    not touches_authentication_system
    not has_database_migrations
}

# =============================================================================
# EXEMPTIONS AND OVERRIDES
# =============================================================================

test_exemption_approved if {
    input.pr.labels[_] == "skip-tests"
    input.pr.approvals >= 2
}

has_api_versioning if {
    some file in input.changed_files
    contains(file.path, "v2")
}

has_api_versioning if {
    input.pr.body
    contains(input.pr.body, "API_VERSION")
}

follows_safe_migration_pattern if {
    input.migration_review.approved == true
}

follows_safe_migration_pattern if {
    input.pr.body
    contains(input.pr.body, "expand-migrate-contract")
}

# =============================================================================
# DECISION OUTPUT
# =============================================================================

# Main decision object
decision := {
    "allowed": allow,
    "risk_level": assessed_risk,
    "violations": violations,
    "warnings": warnings,
    "requirements": requirements,
    "confidence": confidence_score
}

# Generate warnings for reviewers
warnings[warning] {
    assessed_risk == "HIGH"
    warning := {
        "type": "high_risk",
        "message": "High risk changes detected - consider feature flags and extended monitoring",
        "severity": "warning"
    }
}

warnings[warning] {
    large_change_volume
    warning := {
        "type": "large_pr",
        "message": "Large PR detected - consider breaking into smaller, focused changes",
        "severity": "info"
    }
}

warnings[warning] {
    has_dependency_changes
    warning := {
        "type": "dependency_changes",
        "message": "Dependency changes detected - verify compatibility and security",
        "severity": "warning"
    }
}

# Generate requirements for approval
requirements[req] {
    assessed_risk == "HIGH"
    not input.quality_gates.e2e
    req := {
        "type": "e2e_tests",
        "message": "E2E tests required for high-risk changes",
        "blocking": true
    }
}

requirements[req] {
    has_database_migrations
    not input.migration_review.approved
    req := {
        "type": "migration_review",
        "message": "Database migration review required",
        "blocking": true
    }
}

requirements[req] {
    touches_critical_infrastructure
    not codeowners_approved
    req := {
        "type": "codeowner_approval",
        "message": "Code owner approval required for protected paths",
        "blocking": true
    }
}

# Calculate confidence score
confidence_score := score if {
    total_checks := 10
    passed_checks := count([check |
        check := input.quality_gates[_]
        check == true
    ])
    score := (passed_checks / total_checks) * 100
}
