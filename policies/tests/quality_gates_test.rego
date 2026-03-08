package tests.quality_gates

import data.quality.gates

valid_input := {
  "coverage": {
    "global": 0.92,
    "threshold": 0.9,
    "modules": {
      "circuitBreaker": {"actual": 0.96, "target": 0.95},
      "policy": {"actual": 0.9, "target": 0.88}
    }
  },
  "sbom": {
    "generated": true,
    "licenses": ["Apache-2.0", "MIT"]
  },
  "chaos": {
    "lastRunHours": 48
  },
  "load": {
    "p95": 280,
    "target": 300
  },
  "policyBundle": {
    "version": "2025.09.01"
  }
}

test_quality_gate_allows_valid_release {
  gates.allow with input as valid_input
}

test_quality_gate_denies_on_low_coverage {
  bad := valid_input with "coverage".global as 0.7
  not gates.allow with input as bad
  gates.deny_reasons["coverage_below_threshold: 0.70 < 0.90"] with input as bad
}

test_quality_gate_denies_on_forbidden_license {
  bad := valid_input with "sbom".licenses as ["Apache-2.0", "GPL-3.0"]
  not gates.allow with input as bad
  gates.deny_reasons[reason] with input as bad
  reason == "denied_license:GPL-3.0"
}

test_quality_gate_denies_on_stale_chaos {
  bad := valid_input with "chaos".lastRunHours as 1000
  not gates.allow with input as bad
  gates.deny_reasons[reason] with input as bad
  reason == "chaos_stale:1000"
}

test_quality_gate_denies_on_load_breach {
  bad := valid_input with "load".p95 as 450
  not gates.allow with input as bad
  gates.deny_reasons[reason] with input as bad
  reason == "load_slo_breach:450>300"
}
