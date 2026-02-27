package ci.agent_gate

deny[msg] {
  not input.evidence.slsa_uri
  msg := "missing SLSA provenance"
}

deny[msg] {
  not input.evidence.sbom_uri
  msg := "missing SBOM"
}

deny[msg] {
  input.agent.autonomy_level > input.policy.max_autonomy
  msg := sprintf("autonomy level %v not allowed by policy", [input.agent.autonomy_level])
}

deny[msg] {
  input.evidence.regulator_classification == "EU_high-risk"
  not input.review.labels["legal-reviewed"]
  msg := "EU high‑risk requires legal review label"
}
