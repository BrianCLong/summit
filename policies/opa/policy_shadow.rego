package composer.policy_shadow

import future.keywords.if
import future.keywords.in

sub_decisions := [
    data.composer.decision,
    data.composer.decision_dlp.decision,
    data.composer.decision_cmk.decision
]

any_deny {
    some d in sub_decisions
    not d.allow
}

all_allow {
    not any_deny
}

is_allowed {
    input.mode == "shadow"
}
is_allowed {
    input.mode == "enforce"
    all_allow
}

verdict := {
    "mode": input.mode,
    "allow": allow_val,
    "decisions": sub_decisions,
} {
    allow_val := is_allowed_val
}

is_allowed_val { is_allowed }
else = false
