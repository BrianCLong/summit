package policies.truth_defense

# Default Deny: Assume all information is potentially hostile
default allow = false

# Allow operational decisions only if Integrity Score is high enough
allow {
    input.decision_type == "operational"
    input.integrity_score >= 0.7
    not input.flags.quarantine
}

# Allow critical decisions only if Integrity is Ironclad
allow {
    input.decision_type == "critical"
    input.integrity_score >= 0.9
    input.verification.cryptographic_proof == true
    not input.flags.quarantine
}

# Quarantine any input with high adversarial history, regardless of current score
quarantine {
    input.source.history.adversarial_score > 0.5
}

# Quarantine if narrative velocity is too high (flipping stories)
quarantine {
    input.vectors.narrative_velocity > 0.8
}

# Blast Radius Containment:
# If a source is flagged as compromised, deny all downstream derivatives
deny {
    input.provenance.upstream_source_id == data.compromised_sources[_]
}

# Temporal Relevance:
# Deny if the information is too old for the decision type
deny {
    time.now_ns() - input.timestamp_ns > data.temporal_limits[input.decision_type]
}
