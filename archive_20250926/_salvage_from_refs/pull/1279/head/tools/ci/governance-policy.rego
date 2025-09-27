# IntelGraph CI Governance Policy
#
# This Open Policy Agent (OPA) policy defines the governance rules
# for CI/CD pipelines and ensures compliance with security and
# quality standards across the IntelGraph platform.

package intelgraph.ci.governance

import rego.v1

# Default deny rule - explicitly allow what's permitted
default allow := false

# Gate toggles (enabled via CI input)
gate_enabled(name) {
    input.gates[name].enabled == true
}

# -----------------------------
# SLO burn-rate gate (p95/p99)
# -----------------------------
# Expected input shape (example):
# input.gates.slo_burn = {
#   "enabled": true,
#   "thresholds": {"p95": {"1h": 0.02, "6h": 0.05}, "p99": {"1h": 0.01, "6h": 0.03}},
#   "burn_rates": {"p95": {"1h": 0.015, "6h": 0.02}, "p99": {"1h": 0.005, "6h": 0.01}}
# }

pass_slo_burn {
    not gate_enabled("slo_burn")
} else {
    all_ok := [ok |
        percentile := k
        k := {"p95", "p99"}[_]
        windows := ["1h", "6h"]
        some w in windows
        thr := input.gates.slo_burn.thresholds[percentile][w]
        br := input.gates.slo_burn.burn_rates[percentile][w]
        ok := br <= thr
    ]
    # all burn-rate checks must be true
    count([x | x := all_ok[_]; x]) == count(all_ok)
}

# -----------------------------
# SBOM diff gate (no new HIGH/CRITICAL)
# -----------------------------
# Expected input shape:
# input.gates.sbom_diff = {"enabled": true, "new_high": 0, "new_critical": 0}

pass_sbom_diff {
    not gate_enabled("sbom_diff")
} else {
    nh := input.gates.sbom_diff.new_high
    nc := input.gates.sbom_diff.new_critical
    nh == 0
    nc == 0
}

# ----------------------------------
# WebAuthn coverage gate (step-up %)
# ----------------------------------
# Expected input shape:
# input.gates.webauthn = {"enabled": true, "coverage_percent": 85, "min_percent": 80}

pass_webauthn_coverage {
    not gate_enabled("webauthn")
} else {
    cov := input.gates.webauthn.coverage_percent
    min := input.gates.webauthn.min_percent
    cov >= min
}

# CI Workflow Requirements
ci_requirements := {
    "required_jobs": [
        "lint-and-format",
        "typecheck-and-build",
        "test",
        "security-scan"
    ],
    "required_triggers": ["pull_request", "push"],
    "required_branches": ["main", "develop"],
    "max_timeout_minutes": 120,
    "required_node_versions": ["18", "20"],
    "min_coverage_threshold": 80
}

# Security Requirements
security_requirements := {
    "required_scanners": [
        "trivy",
        "npm-audit",
        "secret-scan"
    ],
    "blocked_permissions": [
        "write-all",
        "admin"
    ],
    "required_secret_handling": true,
    "max_secret_exposure_risk": "low"
}

# Quality Requirements
quality_requirements := {
    "required_linters": {
        "typescript": ["eslint", "prettier"],
        "python": ["flake8", "black", "mypy"],
        "go": ["golint", "gofmt"],
        "rust": ["clippy", "rustfmt"]
    },
    "required_tests": ["unit", "integration"],
    "min_code_coverage": 80,
    "max_complexity_score": 10
}

# Service-specific requirements
service_requirements := {
    "api": {
        "requires_database": true,
        "requires_security_scan": true,
        "min_coverage": 85,
        "required_dependencies": ["helmet", "rate-limiting"]
    },
    "web": {
        "requires_build": true,
        "requires_e2e_tests": true,
        "min_coverage": 75,
        "required_dependencies": ["security-headers"]
    },
    "gateway": {
        "requires_database": true,
        "requires_neo4j": true,
        "min_coverage": 90,
        "required_dependencies": ["rate-limiting", "circuit-breaker"]
    }
}

# Rule: CI workflow must exist for each service
workflow_exists[service] {
    service := input.services[_].name
    workflow_path := sprintf(".github/workflows/%s-ci.yml", [service])
    workflow_path in input.workflow_files
}

# Rule: Workflow must use baseline template
uses_baseline_template[workflow] {
    workflow := input.workflows[_]
    contains(workflow.content, "uses: ./.github/workflows/templates/ci-baseline.yml")
}

# Rule: Workflow has required jobs
has_required_jobs[workflow] {
    workflow := input.workflows[_]
    required := ci_requirements.required_jobs
    actual := {job | job := workflow.jobs[_].name}
    count(required - actual) == 0
}

# Rule: Workflow has appropriate timeout
has_reasonable_timeout[workflow] {
    workflow := input.workflows[_]
    job := workflow.jobs[_]
    job.timeout_minutes <= ci_requirements.max_timeout_minutes
}

# Rule: Security scanning is enabled
has_security_scanning[workflow] {
    workflow := input.workflows[_]
    some job in workflow.jobs
    job.name == "security-scan"
    not job.if contains "skip_security_scan"
}

# Rule: No overly broad permissions
no_broad_permissions[workflow] {
    workflow := input.workflows[_]
    not workflow.permissions in security_requirements.blocked_permissions
    not "write-all" in workflow.permissions
}

# Rule: Secrets are properly handled
proper_secret_handling[workflow] {
    workflow := input.workflows[_]
    # Check that secrets are only used in approved contexts
    secret_refs := [ref |
        step := workflow.jobs[_].steps[_]
        ref := step.env[_]
        contains(ref, "secrets.")
    ]
    # Ensure no secrets in logs or outputs
    count([ref | ref := secret_refs[_]; contains(ref, "echo")]) == 0
}

# Rule: Service has required files
has_required_files[service] {
    service := input.services[_]
    required := ["README.md", "package.json", ".gitignore"]
    actual := {file | file := service.files[_]}
    count(required - actual) == 0
}

# Rule: Package.json has required fields
valid_package_json[service] {
    service := input.services[_]
    pkg := service.package_json
    required := ["name", "version", "description", "license", "scripts"]
    actual := {field | pkg[field]}
    count(required - actual) == 0

    # Must have lint and test scripts
    pkg.scripts.lint
    pkg.scripts.test
}

# Rule: Service follows naming conventions
valid_service_name[service] {
    service := input.services[_]
    # Service names must be lowercase with hyphens
    regex.match("^[a-z0-9-]+$", service.name)
    # Must not start or end with hyphen
    not startswith(service.name, "-")
    not endswith(service.name, "-")
}

# Rule: Security dependencies are included
has_security_dependencies[service] {
    service := input.services[_]
    service_type := service_requirements[service.name]
    service_type.required_dependencies

    pkg := service.package_json
    actual_deps := {dep |
        pkg.dependencies[dep]
    } | {dep |
        pkg.devDependencies[dep]
    }

    required := {dep | dep := service_type.required_dependencies[_]}
    count(required - actual_deps) == 0
}

# Rule: Coverage meets minimum threshold
meets_coverage_threshold[service] {
    service := input.services[_]
    service.coverage_percentage >= quality_requirements.min_code_coverage
}

# Rule: No high-severity vulnerabilities
no_high_vulnerabilities[service] {
    service := input.services[_]
    vulnerabilities := service.security_scan.vulnerabilities
    high_severity := [vuln |
        vuln := vulnerabilities[_]
        vuln.severity in ["HIGH", "CRITICAL"]
    ]
    count(high_severity) == 0
}

# Rule: License is compatible
compatible_license[service] {
    service := input.services[_]
    pkg := service.package_json
    pkg.license in [
        "MIT",
        "Apache-2.0",
        "BSD-3-Clause",
        "Proprietary"
    ]
}

# Main allow rule - all requirements must be met
allow {
    # Check that all services have workflows
    service_count := count(input.services)
    workflow_count := count([s | workflow_exists[s]])
    service_count == workflow_count

    # Check that all workflows use baseline template
    baseline_count := count([w | uses_baseline_template[w]])
    baseline_count == count(input.workflows)

    # Check required jobs
    job_count := count([w | has_required_jobs[w]])
    job_count == count(input.workflows)

    # Check security requirements
    security_count := count([w | has_security_scanning[w]])
    security_count == count(input.workflows)

    permission_count := count([w | no_broad_permissions[w]])
    permission_count == count(input.workflows)

    # Check service requirements
    file_count := count([s | has_required_files[s]])
    file_count == count(input.services)

    pkg_count := count([s | valid_package_json[s]])
    pkg_count == count(input.services)

    name_count := count([s | valid_service_name[s]])
    name_count == count(input.services)

    # New GA gates (conditional on input.gates.*.enabled)
    pass_slo_burn
    pass_sbom_diff
    pass_webauthn_coverage
}

# Violation reporting
violations[violation] {
    not workflow_exists[service]
    violation := {
        "type": "missing_workflow",
        "service": service,
        "message": sprintf("Service '%s' is missing CI workflow", [service]),
        "severity": "high"
    }
}

violations[violation] {
    workflow := input.workflows[_]
    not uses_baseline_template[workflow]
    violation := {
        "type": "missing_baseline_template",
        "workflow": workflow.name,
        "message": sprintf("Workflow '%s' does not use baseline template", [workflow.name]),
        "severity": "high"
    }
}

violations[violation] {
    workflow := input.workflows[_]
    not has_required_jobs[workflow]
    violation := {
        "type": "missing_required_jobs",
        "workflow": workflow.name,
        "message": sprintf("Workflow '%s' is missing required jobs", [workflow.name]),
        "severity": "medium"
    }
}

violations[violation] {
    workflow := input.workflows[_]
    not has_security_scanning[workflow]
    violation := {
        "type": "missing_security_scan",
        "workflow": workflow.name,
        "message": sprintf("Workflow '%s' has security scanning disabled", [workflow.name]),
        "severity": "high"
    }
}

violations[violation] {
    workflow := input.workflows[_]
    not no_broad_permissions[workflow]
    violation := {
        "type": "overly_broad_permissions",
        "workflow": workflow.name,
        "message": sprintf("Workflow '%s' has overly broad permissions", [workflow.name]),
        "severity": "high"
    }
}

# GA Gate violations
violations[violation] {
    gate_enabled("slo_burn")
    not pass_slo_burn
    violation := {
        "type": "slo_burn_rate_exceeded",
        "message": "SLO burn-rate exceeded thresholds (p95/p99 over 1h/6h)",
        "severity": "high"
    }
}

violations[violation] {
    gate_enabled("sbom_diff")
    not pass_sbom_diff
    violation := {
        "type": "sbom_new_high_critical",
        "message": sprintf("SBOM diff introduces new HIGH (%d) or CRITICAL (%d) CVEs", [
            input.gates.sbom_diff.new_high,
            input.gates.sbom_diff.new_critical
        ]),
        "severity": "critical"
    }
}

violations[violation] {
    gate_enabled("webauthn")
    not pass_webauthn_coverage
    violation := {
        "type": "webauthn_coverage_below_threshold",
        "message": sprintf("WebAuthn step-up coverage %d%% below required %d%%", [
            input.gates.webauthn.coverage_percent,
            input.gates.webauthn.min_percent
        ]),
        "severity": "high"
    }
}

violations[violation] {
    service := input.services[_]
    not has_required_files[service]
    violation := {
        "type": "missing_required_files",
        "service": service.name,
        "message": sprintf("Service '%s' is missing required files", [service.name]),
        "severity": "medium"
    }
}

violations[violation] {
    service := input.services[_]
    not valid_package_json[service]
    violation := {
        "type": "invalid_package_json",
        "service": service.name,
        "message": sprintf("Service '%s' has invalid package.json", [service.name]),
        "severity": "medium"
    }
}

violations[violation] {
    service := input.services[_]
    not no_high_vulnerabilities[service]
    vuln_count := count([v |
        v := service.security_scan.vulnerabilities[_]
        v.severity in ["HIGH", "CRITICAL"]
    ])
    violation := {
        "type": "high_severity_vulnerabilities",
        "service": service.name,
        "message": sprintf("Service '%s' has %d high/critical vulnerabilities", [service.name, vuln_count]),
        "severity": "critical"
    }
}

violations[violation] {
    service := input.services[_]
    not meets_coverage_threshold[service]
    violation := {
        "type": "low_code_coverage",
        "service": service.name,
        "message": sprintf("Service '%s' coverage (%d%%) below threshold (%d%%)", [
            service.name,
            service.coverage_percentage,
            quality_requirements.min_code_coverage
        ]),
        "severity": "medium"
    }
}

# Summary reporting
summary := {
    "total_services": count(input.services),
    "total_workflows": count(input.workflows),
    "compliant_services": count([s |
        workflow_exists[s]
        has_required_files[input.services[_]]
        valid_package_json[input.services[_]]
    ]),
    "total_violations": count(violations),
    "critical_violations": count([v |
        v := violations[_]
        v.severity == "critical"
    ]),
    "high_violations": count([v |
        v := violations[_]
        v.severity == "high"
    ]),
    "medium_violations": count([v |
        v := violations[_]
        v.severity == "medium"
    ]),
    "compliance_percentage": (count([s |
        workflow_exists[s]
        has_required_files[input.services[_]]
        valid_package_json[input.services[_]]
    ]) * 100) / count(input.services)
}

# Recommendations based on violations
recommendations[rec] {
    count([v | v := violations[_]; v.type == "missing_workflow"]) > 0
    rec := {
        "priority": "high",
        "action": "Create missing CI workflows using the baseline template",
        "details": "Use .github/workflows/templates/ci-baseline.yml as template"
    }
}

recommendations[rec] {
    count([v | v := violations[_]; v.type == "high_severity_vulnerabilities"]) > 0
    rec := {
        "priority": "critical",
        "action": "Address high and critical security vulnerabilities",
        "details": "Run security scans and update vulnerable dependencies"
    }
}

recommendations[rec] {
    count([v | v := violations[_]; v.type == "low_code_coverage"]) > 3
    rec := {
        "priority": "medium",
        "action": "Improve test coverage across services",
        "details": "Add unit and integration tests to meet coverage thresholds"
    }
}

recommendations[rec] {
    summary.compliance_percentage < 80
    rec := {
        "priority": "high",
        "action": "Comprehensive governance review needed",
        "details": "Less than 80% of services are compliant with CI governance policies"
    }
}
