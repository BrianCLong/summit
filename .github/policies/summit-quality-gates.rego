# Summit Platform Quality Gates
# OPA policy for enforcing code quality standards

package summit.quality

import future.keywords.if
import future.keywords.in

# Default deny
default allow = false

# Global settings
AUTHORIZED_USERS := {
    "BrianCLong",
    "platform-team",
    "sre-team",
    "backend-team",
    "frontend-team"
}

CRITICAL_PATHS := {
    ".github/workflows/",
    ".github/policies/",
    "helm/",
    "infra/helm/",
    "db/migrations/",
    "ops/db/",
    "RUNBOOKS/",
    "docs/runbooks/",
    "server/src/conductor/auth/",
    "server/src/conductor/api/",
    "charts/ig-platform/values.yaml",
    "services/*/migrations/",
    "tools/backup/",
    "tools/deployment/"
}

SECURITY_PATTERNS := {
    "password\\s*[:=]\\s*['\"][^'\"]+['\"]",
    "api[_-]?key\\s*[:=]\\s*['\"][^'\"]+['\"]",
    "secret\\s*[:=]\\s*['\"][^'\"]+['\"]",
    "token\\s*[:=]\\s*['\"][^'\"]+['\"]"
}

# Allow if all quality gates pass
allow if {
    input.pr
    input.pr.draft == false
    input.pr.mergeable == true
    all_quality_gates_pass
    no_security_violations
    authorized_user
}

# Emergency override for production hotfixes
allow if {
    input.pr
    input.pr.labels[_] == "emergency-hotfix"
    input.pr.author in AUTHORIZED_USERS
    critical_fixes_only
}

# Check if all quality gates pass
all_quality_gates_pass if {
    input.quality_gates.build == true
    input.quality_gates.typecheck == true
    input.quality_gates.lint == true
    input.quality_gates.tests == true
    input.quality_gates.security == true
}

# Helm charts must pass validation
all_quality_gates_pass if {
    has_helm_changes
    input.quality_gates.helm == true
}

all_quality_gates_pass if {
    has_database_changes
    input.quality_gates.migrations == true
}

# High risk PRs must pass E2E tests
all_quality_gates_pass if {
    input.analysis.risk_level == "HIGH"
    input.quality_gates.e2e == true
}

# Check for security violations
no_security_violations if {
    not has_secrets_in_code
    not has_critical_vulnerabilities
    not has_exposed_credentials
}

# Check if user is authorized
authorized_user if {
    input.pr.author in AUTHORIZED_USERS
}

# Helper rules
has_helm_changes if {
    some file in input.changed_files
    startswith(file, "charts/")
}

has_helm_changes if {
    some file in input.changed_files
    startswith(file, "helm/")
}

has_helm_changes if {
    some file in input.changed_files
    startswith(file, "infra/helm/")
}

has_database_changes if {
    some file in input.changed_files
    startswith(file, "db/migrations/")
}

has_database_changes if {
    some file in input.changed_files
    startswith(file, "db/seeds/")
}

has_database_changes if {
    some file in input.changed_files
    startswith(file, "server/src/migrations/")
}

has_database_changes if {
    some file in input.changed_files
    startswith(file, "ops/db/")
}

has_database_changes if {
    some file in input.changed_files
    contains(file, "migration")
}

has_critical_path_changes if {
    some file in input.changed_files
    some path in CRITICAL_PATHS
    startswith(file, path)
}

has_secrets_in_code if {
    some file in input.changed_files
    some pattern in SECURITY_PATTERNS
    regex.match(pattern, input.file_contents[file])
}

has_critical_vulnerabilities if {
    input.security_scan.critical_count > 0
}

has_exposed_credentials if {
    some file in input.changed_files
    contains(file, ".env")
    not contains(file, ".env.example")
}

critical_fixes_only if {
    count(input.changed_files) <= 5
    not has_feature_additions
}

has_feature_additions if {
    some file in input.changed_files
    contains(file, "test")
    input.analysis.additions > input.analysis.deletions
}

# Generate warnings for reviewers
warnings[msg] {
    has_database_changes
    msg := "Database migrations detected - coordinate with DBA team"
}

warnings[msg] {
    input.analysis.risk_level == "HIGH"
    msg := "High risk changes - consider feature flags and extended monitoring"
}

warnings[msg] {
    has_critical_path_changes
    msg := "Critical infrastructure changes - extra review required"
}

warnings[msg] {
    input.analysis.complexity > 15
    msg := "High complexity changes - consider breaking into smaller PRs"
}

warnings[msg] {
    count(input.changed_files) > 20
    msg := "Large PR detected - consider splitting for easier review"
}

# Generate requirements for merge
requirements[req] {
    input.analysis.risk_level == "HIGH"
    not input.quality_gates.e2e
    req := "E2E tests must pass for high risk changes"
}

requirements[req] {
    has_database_changes
    not input.migration_review_approved
    req := "Database migration review required"
}

requirements[req] {
    has_helm_changes
    input.quality_gates.helm != true
    req := "Helm lint must pass for Helm chart changes"
}

requirements[req] {
    has_database_changes
    input.quality_gates.migrations != true
    req := "DB migration gate must pass for database changes"
}

requirements[req] {
    input.quality_gates.security == false
    req := "Security scan must pass before merge"
}

requirements[req] {
    input.pr.draft == true
    req := "PR must be marked as ready for review"
}

# Auto-fix suggestions
auto_fixes[fix] {
    input.quality_gates.lint == false
    fix := {
        "type": "lint",
        "command": "pnpm run lint --fix",
        "description": "Auto-fix linting issues"
    }
}

auto_fixes[fix] {
    input.quality_gates.format == false
    fix := {
        "type": "format",
        "command": "pnpm run format",
        "description": "Apply prettier formatting"
    }
}

auto_fixes[fix] {
    has_package_json_changes
    fix := {
        "type": "sort-package",
        "command": "npx sort-package-json package.json",
        "description": "Sort package.json fields"
    }
}

has_package_json_changes if {
    some file in input.changed_files
    endswith(file, "package.json")
}

# Deployment safety checks
deployment_safe if {
    all_quality_gates_pass
    no_security_violations
    backward_compatible_changes
}

backward_compatible_changes if {
    not has_breaking_api_changes
    not has_breaking_schema_changes
}

has_breaking_api_changes if {
    some file in input.changed_files
    contains(file, "graphql")
    contains(file, "schema")
    input.api_diff.breaking_changes > 0
}

has_breaking_schema_changes if {
    has_database_changes
    input.schema_diff.breaking_changes > 0
}

# Generate final decision
decision := {
    "approved": allow,
    "warnings": warnings,
    "requirements": requirements,
    "auto_fixes": auto_fixes,
    "deployment_safe": deployment_safe,
    "confidence": confidence_score
}

confidence_score := score if {
    total_gates := 8
    passed_gates := count([gate | input.quality_gates[gate] == true])
    score := (passed_gates / total_gates) * 100
}
