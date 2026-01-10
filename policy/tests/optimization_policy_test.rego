package policy.tests.optimization

import data.policy.optimization.authz as authz
import data.policy.optimization.budget as budget
import data.policy.optimization.fail_closed as fail_closed

allows_prompt_compaction if {
  authz.allow with input as {
    "loop_id": "L-A1",
    "action": "prompt_compaction",
    "mode": "active",
    "scope": {"allowed": true},
    "approvals": {"valid": true},
  }
}

denies_unknown_loop if {
  authz.deny["unknown_loop"] with input as {
    "loop_id": "L-UNKNOWN",
    "action": "prompt_compaction",
    "mode": "advisory",
    "scope": {"allowed": true},
    "approvals": {"valid": true},
  }
}

allows_with_budget_headroom if {
  budget.allow with input as {
    "budget": {
      "available": 1.0,
      "loop_remaining": 1,
      "global_remaining": 5,
    },
    "cost": 0.05,
  }
}

denies_when_budget_exhausted if {
  budget.deny["loop_budget_exhausted"] with input as {
    "budget": {
      "available": 1.0,
      "loop_remaining": 0,
      "global_remaining": 5,
    },
    "cost": 0.05,
  }
}

denies_missing_required_signals if {
  fail_closed.deny with input as {
    "loop_id": "L-A1",
    "action": "prompt_compaction",
    "mode": "advisory",
    "signals": {"token_delta": -0.1},
    "required_signals": ["token_delta", "success_rate"],
  }
}
