package revops.discount_approvals

import data.revops.config as rcfg
import data.revops.invariants

default decision = {
  "allowed": false,
  "reason": "not_evaluated",
  "required_approvals": [],
  "max_discount_allowed": 0,
  "flags": []
}

decision := out {
  q := input.quote
  tenant := input.tenant.id

  seg := q.segment
  conf := rcfg.tenant[tenant].discounts[seg]

  max_allowed := conf.max_discount[input.subject.role]
  approvals := approvals_chain(q, conf)

  not invariants.deny_discount[_] with input as input

  out := {
    "allowed": true,
    "reason": cond_reason(q.discount_percentage > max_allowed),
    "required_approvals": approvals,
    "max_discount_allowed": max_allowed,
    "flags": flags(q, conf)
  }
}

approvals_chain(q, conf) = approvals {
  approvals := [a | threshold := conf.approvals.thresholds[_]; q.discount_percentage <= threshold.max_discount; a := threshold.approvers[_]]
}

flags(q, conf) = out {
  default out = []
  q.term_months < conf.min_term_months
  out := ["short_term"]
}

flags(q, _) = out {
  default out = []
  q.non_standard_terms
  count(q.non_standard_terms) > 0
  out := ["non_standard_term"]
}

cond_reason(over) = reason {
  over
  reason := "discount_above_role_limit"
}

cond_reason(false) = "ok"
