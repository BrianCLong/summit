package summit.governance.mvp4

import future.keywords.if

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
    msg := "Critical actions require break_glass flag"
}

# Rule: Enforce License Entitlements
deny {
    input.feature_flag
    not entitlements_include(input.user.entitlements, input.feature_flag)
    msg := "User does not have license for this feature"
}

entitlements_include(entitlements, feature) {
    some i
    entitlements[i] == feature
}
