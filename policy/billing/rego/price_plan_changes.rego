package billing.price_plan_changes

import data.billing.invariants

allowed_roles := {"finance_manager", "revops_lead", "cfo"}

risk_thresholds := {
  "medium": 0.2,
  "high": 0.4
}

default decision = {
  "allowed": false,
  "reason": "not_evaluated",
  "required_approvals": [],
  "flags": []
}

decision = out {
  subj := input.subject
  allowed_roles[subj.role]
  not invariants.plan_change_blocked(input)

  delta := compute_delta(input.plan_before, input.plan_after)
  risk := risk_level(delta)
  approvals := approvals_for(risk)
  flags := delta_flags(delta)

  out := {
    "allowed": true,
    "reason": sprintf("change_risk_%s", [risk]),
    "required_approvals": approvals,
    "flags": flags
  }
}

compute_delta(before, after) = {
  "price_changes": price_changes(before.prices, after.prices),
  "max_change": max_price_change(before.prices, after.prices),
  "discount_change": discount_delta(before.discounts, after.discounts),
  "new_skus": new_skus(before.prices, after.prices),
  "removed_skus": removed_skus(before.prices, after.prices)
} {
  before
  after
}

price_changes(before, after) = [change | sku := keys(after)[_];
  before_price := value_or_default(before[sku], after[sku]);
  after_price := after[sku];
  diff := after_price - before_price;
  pct := percent_change(before_price, after_price);
  change := {"sku": sku, "before": before_price, "after": after_price, "delta": diff, "percent": pct}
]

max_price_change(before, after) = max(abs_changes) {
  abs_changes := [abs(c.percent) | c := price_changes(before, after)[_]]
}

max_price_change(_, _) = 0 { true }

percent_change(before, after) = pct {
  before == 0
  pct := 1
} else = pct {
  pct := (after - before) / before
}

value_or_default(v, fallback) = out {
  out := v
} else = fallback

risk_level(delta) = "high" {
  delta.max_change >= risk_thresholds["high"]
} else = "medium" {
  delta.max_change >= risk_thresholds["medium"]
} else = "medium" {
  count(delta.new_skus) > 0
} else = "low"

approvals_for("low") = []
approvals_for("medium") = ["finance_manager"]
approvals_for("high") = ["finance_manager", "cfo"]

# Flags inform Switchboard dashboards about risky attributes.
delta_flags(delta) = flags {
  base := []
  high_change := {f | delta.max_change >= risk_thresholds["high"]; f := "high_revenue_impact"}
  new_sku := {f | count(delta.new_skus) > 0; f := "new_sku_added"}
  removed := {f | count(delta.removed_skus) > 0; f := "sku_removed"}
  discount := {f | abs(delta.discount_change) > 0.1; f := "discount_shift"}
  flags := array.concat(base, array.concat(array.concat(array.concat([], high_change), new_sku), array.concat(removed, discount)))
}

new_skus(before, after) = [sku | sku := keys(after)[_]; not before[sku]]

removed_skus(before, after) = [sku | sku := keys(before)[_]; not after[sku]]

discount_delta(before, after) = diff {
  before_default := value_or_default(before["default"], 0)
  after_default := value_or_default(after["default"], 0)
  diff := after_default - before_default
}
