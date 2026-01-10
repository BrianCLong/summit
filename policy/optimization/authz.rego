package policy.optimization.authz

import future.keywords.if

default allow := false

allowed_actions := {
  "L-A1": {
    "prompt_compaction",
    "prompt_template_swap",
    "truncation_toggle",
  },
  "L-B1": {
    "retry_count_adjust",
    "backoff_adjust",
    "jitter_mode_toggle",
  },
  "L-C1": {
    "concurrency_adjust",
    "lane_partition_shift",
  },
  "L-D1": {
    "emit_scope_recommendation",
    "flag_risky_scope",
  },
}

default deny := {}

deny["unknown_loop"] if {
  not allowed_actions[input.loop_id]
}

deny["action_not_allowed"] if {
  allowed_actions[input.loop_id]
  not allowed_actions[input.loop_id][input.action]
}

deny["mode_not_allowed"] if {
  input.mode != "advisory"
  input.mode != "active"
}

deny["scope_not_allowed"] if {
  not input.scope.allowed
}

deny["approval_missing"] if {
  not input.approvals.valid
}

allow if {
  count(deny) == 0
}
