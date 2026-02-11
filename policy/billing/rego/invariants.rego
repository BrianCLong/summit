import future.keywords.in
import future.keywords.if
package billing.invariants

# Guardrails shared across billing policies.

# Minimum unit prices per SKU; fallback floor keeps prices above zero.
default price_floors := {
  "default": 0.05,
  "cpu_hour": 0.08,
  "storage_gb": 0.12
}

default max_discount := 0.6

default high_invoice_threshold := 50000

default high_credit_threshold := 20000

# Cost model changes should never affect closed months (YYYY-MM).
default closed_periods := []

price_floor(sku) := floor if {
  floor := price_floors[sku]
} else := price_floors["default"]

plan_change_blocked(req) if {
  some sku
  new_price := req.plan_after.prices[sku]
  floor := price_floor(sku)
  new_price < floor
}

plan_change_blocked(req) if {
  before := req.plan_before.effective_at
  after := req.plan_after.effective_at
  before != ""; after != ""
  # Prevent retroactive plan changes.
  before > after
}

invoice_action_blocked(req) if {
  req.action == "cancel"
  req.invoice.status == "paid"
}

invoice_action_blocked(req) if {
  req.action == "mark_paid"
  req.context.source == "manual"
  not req.context.evidence
}

credit_blocked(req) if {
  req.credit_memo.amount < 0
}

credit_blocked(req) if {
  req.credit_memo.type == "write_off"
  req.context.reason == ""
}

cost_model_blocked(req) if {
  period := req.model_before.effective_at
  some closed_period in closed_periods
  closed_period == substring(period, 0, 7)
}
