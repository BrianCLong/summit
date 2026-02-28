package ci.agent_gate

import rego.v1

deny contains msg if {
  slsa_uri := object.get(input.evidence, "slsa_uri", "")
  trim_space(slsa_uri) == ""
  msg := "missing SLSA provenance"
}

deny contains msg if {
  sbom_uri := object.get(input.evidence, "sbom_uri", "")
  trim_space(sbom_uri) == ""
  msg := "missing SBOM"
}

deny contains msg if {
  input.agent.autonomy_level > input.policy.max_autonomy
  msg := sprintf("autonomy level %v not allowed by policy", [input.agent.autonomy_level])
}

deny contains msg if {
  input.evidence.regulator_classification == "EU_high-risk"
  not input.review.labels["legal-reviewed"]
  msg := "EU high-risk requires legal review label"
}
