package summit.epistemic

default allow = false

allow if {
  input.support_score >= data.policy.min_support_score
  input.epistemic_uncertainty <= data.policy.max_epistemic_uncertainty
  input.independent_source_count >= data.policy.min_independent_sources
  input.has_provenance == true
}

allow if {
  input.has_override_rationale == true
  input.has_provenance == true
}
