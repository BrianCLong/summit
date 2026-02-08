package narrative_ci.tier_taxonomy

default allow = false

allow {
  allowed := { t | t := input.allowed_tiers[_] }
  every_candidate_tier_allowed(allowed)
}

every_candidate_tier_allowed(allowed) {
  cands := input.handoff_candidates
  not exists_disallowed(cands, allowed)
}

exists_disallowed(cands, allowed) {
  some i
  t := cands[i].to_tier
  not allowed[t]
}
