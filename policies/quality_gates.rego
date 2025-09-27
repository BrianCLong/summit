package quality.gates

deny_reasons[reason] {
  input.coverage == null
  reason := "coverage_missing"
}

deny_reasons[reason] {
  input.coverage.global < input.coverage.threshold
  reason := sprintf("coverage_below_threshold: %.2f < %.2f", [input.coverage.global, input.coverage.threshold])
}

deny_reasons[reason] {
  some module
  required := input.coverage.modules[module]
  required != null
  required.actual < required.target
  reason := sprintf("module_%s_coverage: %.2f < %.2f", [module, required.actual, required.target])
}

deny_reasons[reason] {
  not input.sbom.generated
  reason := "sbom_not_generated"
}

deny_reasons[reason] {
  some license
  license := input.sbom.licenses[_]
  deny := {"GPL-3.0", "AGPL-3.0", "SSPL-1.0"}
  deny[license]
  reason := sprintf("denied_license:%s", [license])
}

deny_reasons[reason] {
  input.chaos == null
  reason := "chaos_missing"
}

deny_reasons[reason] {
  input.chaos.lastRunHours > 720
  reason := sprintf("chaos_stale:%d", [input.chaos.lastRunHours])
}

deny_reasons[reason] {
  input.load.p95 > input.load.target
  reason := sprintf("load_slo_breach:%.0f>%.0f", [input.load.p95, input.load.target])
}

deny_reasons[reason] {
  input.policyBundle == null
  reason := "policy_bundle_missing"
}

allow {
  count({r | deny_reasons[r]}) == 0
}
