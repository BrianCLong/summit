package summit.release_test

import future.keywords.if
import future.keywords.in
import data.summit.release.allow
import data.summit.release.violations
import data.summit.release.decision

test_allow_all_green if {
    allow with input as {
        "ci_artifacts": {"status": "success", "tenant_isolation": "ok", "drift_resolved": true},
        "test_reports": {"coverage": 85, "e2e": "green"},
        "npm_audit": {"status": "clean", "vulnerabilities": 0}
    }
}

test_decision_success if {
    d := decision with input as {
        "ci_artifacts": {"status": "success", "tenant_isolation": "ok", "drift_resolved": true},
        "test_reports": {"coverage": 90, "e2e": "green"},
        "npm_audit": {"status": "clean", "vulnerabilities": 0}
    }
    d.allow == true
    d.coverage == 90
    count(d.violations) == 0
}

test_decision_failure_coverage if {
    d := decision with input as {
        "ci_artifacts": {"status": "success", "tenant_isolation": "ok", "drift_resolved": true},
        "test_reports": {"coverage": 80, "e2e": "green"},
        "npm_audit": {"status": "clean", "vulnerabilities": 0}
    }
    d.allow == false
    d.coverage == 80
}

test_decision_violations if {
    d := decision with input as {
        "ci_artifacts": {"status": "success", "tenant_isolation": "ok", "drift_resolved": false},
        "test_reports": {"coverage": 90, "e2e": "green"},
        "npm_audit": {"status": "clean", "vulnerabilities": 10}
    }
    d.allow == false
    count(d.violations) == 2
    d.violations["Too many vulnerabilities (>5)"]
    d.violations["Unresolved infrastructure drift"]
}

test_deny_ci_failed if {
    not allow with input as {
        "ci_artifacts": {"status": "failed", "tenant_isolation": "ok", "drift_resolved": true},
        "test_reports": {"coverage": 85, "e2e": "green"},
        "npm_audit": {"status": "clean", "vulnerabilities": 0}
    }
}

test_deny_vulnerabilities_gt_5 if {
    violations["Too many vulnerabilities (>5)"] with input as {
        "ci_artifacts": {"status": "success", "tenant_isolation": "ok", "drift_resolved": true},
        "test_reports": {"coverage": 85, "e2e": "green"},
        "npm_audit": {"status": "clean", "vulnerabilities": 6}
    }
}
