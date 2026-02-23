package antigravity.change
import future.keywords.in

default classification := "restricted"

# Inputs expected:
# input.change.files: [{path, kind}]  kind: "code"|"docs"|"ci"|"policy"|"infra"
# input.change.flags: {touches_secrets, touches_trust_root, reduces_coverage, modifies_policy}
# input.change.impact: {spend_delta_percent, reliability_risk_score, security_risk_score}
# input.change.checks: {all_required_passed}
# input.decision: {confidence}

is_docs_non_policy {
  some f in input.change.files
  f.kind == "docs"
  not input.change.flags.modifies_policy
  not input.change.flags.touches_secrets
  not input.change.flags.touches_trust_root
}

is_ci_determinism_fix {
  some f in input.change.files
  f.kind == "ci"
  not input.change.flags.reduces_coverage
}

is_low_risk_dependency_bump {
  # treat as code changes, but bounded by checks + risk thresholds
  input.change.checks.all_required_passed
  input.change.impact.security_risk_score <= 1
  input.change.impact.reliability_risk_score <= 2
  input.change.impact.spend_delta_percent <= 3.0
}

autonomous_class {
  is_docs_non_policy
} else {
  is_ci_determinism_fix
} else {
  is_low_risk_dependency_bump
}

classification := "autonomous" {
  autonomous_class
}
