import future.keywords.in
package revops.discount_approvals

import future.keywords.if
import future.keywords.contains
import data.revops.config as rcfg
import data.revops.invariants

default decision := {
  "allowed": false,
  "reason": "not_evaluated",
  "required_approvals": [],
  "max_discount_allowed": 0,
  "flags": []
}

decision := out if {
  q := input.quote
  tenant := input.tenant.id

  seg := q.segment
  conf := rcfg.tenant[tenant].discounts[seg]

  max_allowed := conf.max_discount[input.subject.role]
  approvals := approvals_chain(q, conf)

  count(invariants.deny_discount) == 0 with input as input

  out := {
    "allowed": true,
    "reason": cond_reason(q.discount_percentage > max_allowed),
    "required_approvals": approvals,
    "max_discount_allowed": max_allowed,
    "flags": flags(q, conf)
  }
}

approvals_chain(q, conf) := approvals if {
  approvals := [a | threshold := conf.approvals.thresholds[_]; q.discount_percentage <= threshold.max_discount; a := threshold.approvers[_]]
}

# Flags for short term
flags(q, conf) := ["short_term"] if {
  q.term_months < conf.min_term_months
}

# Flags for non-standard terms
flags(q, _) := ["non_standard_term"] if {
  q.non_standard_terms
  count(q.non_standard_terms) > 0
}

# Default flags - no conditions met
flags(q, conf) := [] if {
  not q.term_months < conf.min_term_months
  not has_non_standard_terms(q)
}

has_non_standard_terms(q) if {
  q.non_standard_terms
  count(q.non_standard_terms) > 0
}

cond_reason(over) := reason if {
  over
  reason := "discount_above_role_limit"
}

cond_reason(false) := "ok"
