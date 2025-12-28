package summit.graduation

test_allows_matching_states_without_promotion {
  input := {
    "graduation": {
      "frontend_state": "Experimental",
      "backend_state": "Experimental",
      "promotion_intent": "None",
      "evidence": "",
      "joint_approval": "Pending",
    },
  }

  decision.allowed with input as input
  count(decision.violations) == 0 with input as input
}

test_blocks_mismatched_states {
  input := {
    "graduation": {
      "frontend_state": "GA-Adjacent",
      "backend_state": "Experimental",
      "promotion_intent": "None",
      "evidence": "",
      "joint_approval": "Pending",
    },
  }

  not decision.allowed with input as input
  some msg
  msg == "Frontend and backend lifecycle states must match." with input as input
}

test_blocks_promotion_without_evidence {
  input := {
    "graduation": {
      "frontend_state": "GA-Adjacent",
      "backend_state": "GA-Adjacent",
      "promotion_intent": "Experimental → GA-Adjacent",
      "evidence": "",
      "joint_approval": "Approved",
    },
  }

  not decision.allowed with input as input
  some msg
  msg == "Evidence bundle required for promotion intent." with input as input
}

test_allows_promotion_with_evidence_and_approval {
  input := {
    "graduation": {
      "frontend_state": "GA-Adjacent",
      "backend_state": "GA-Adjacent",
      "promotion_intent": "Experimental → GA-Adjacent",
      "evidence": "evidence/graduation/sample.md",
      "joint_approval": "Approved",
    },
  }

  decision.allowed with input as input
}
