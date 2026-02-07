import future.keywords
package antigravity.merge

default allow_automerge := false
default require_human_countersign := true

# Inputs expected:
# input.classification: "autonomous"|"restricted"
# input.decision.confidence: number 0..1
# input.change.flags.*
# input.change.checks.all_required_passed
# input.thresholds.autonomy.confidence_min_for_automerge

# Hard stops
hard_stop {
  input.change.flags.touches_secrets
} else {
  input.change.flags.touches_trust_root
} else {
  input.change.flags.modifies_policy
} else {
  input.change.flags.reduces_coverage
}

require_human_countersign := true {
  hard_stop
}

require_human_countersign := true {
  input.classification == "restricted"
}

allow_automerge := true {
  input.classification == "autonomous"
  input.change.checks.all_required_passed
  input.decision.confidence >= input.thresholds.autonomy.confidence_min_for_automerge
  not hard_stop
}

require_human_countersign := false {
  allow_automerge
}
