package composer.policy_shadow

import future.keywords.in

# Shadow policy to aggregate decisions

decisions := [data.composer.decision, data.composer.decision_dlp.decision, data.composer.decision_cmk.decision]

allow_all {
    all_allowed
}

all_allowed {
    some d in decisions
    d.allow == true
}

# In modern Rego, 'all' is often used as a higher-order function or built-in
# but here it seems intended as logic.
