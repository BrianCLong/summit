package summit.governance.mvp4

# Goal: Ensure EVERY mutation has an explicit governance verdict.

default allow = false

# Allow only if specific policy grants access
allow {
    input.type == "mutation"
    input.verdict == "allow"
    has_valid_provenance(input.provenance)
}

# Rule: Provenance must define actor and justification
has_valid_provenance(prov) {
    prov.actor_id != ""
    prov.justification != ""
    prov.timestamp > 0
}

# Rule: Block High Risk actions without "Break Glass" flag
deny {
    input.risk_level == "critical"
    not input.break_glass == true
}

# Rule: Enforce License Entitlements
deny {
    input.feature_flag
    not entitlements_include(input.user.entitlements, input.feature_flag)
}

entitlements_include(entitlements, feature) {
    entitlements[_] == feature
}
