package billing.invariants

# Guardrails shared across billing policies.

# Minimum unit prices per SKU; fallback floor keeps prices above zero.
default price_floors = {
  "default": 0.05,
  "cpu_hour": 0.08,
  "storage_gb": 0.12
}

default max_discount = 0.6

default high_invoice_threshold = 50000

default high_credit_threshold = 20000

# Cost model changes should never affect closed months (YYYY-MM).
default closed_periods = []

price_floor(sku) = floor {
  floor := price_floors[sku]
} else = price_floors["default"]

plan_change_blocked(input) {
  some sku
  new_price := input.plan_after.prices[sku]
  floor := price_floor(sku)
  new_price < floor
}

plan_change_blocked(input) {
  before := input.plan_before.effective_at
  after := input.plan_after.effective_at
  before != ""; after != ""
  # Prevent retroactive plan changes.
  before > after
}

invoice_action_blocked(input) {
  input.action == "cancel"
  input.invoice.status == "paid"
}

invoice_action_blocked(input) {
  input.action == "mark_paid"
  input.context.source == "manual"
  not input.context.evidence
}

credit_blocked(input) {
  input.credit_memo.amount < 0
}

credit_blocked(input) {
  input.credit_memo.type == "write_off"
  input.context.reason == ""
}

cost_model_blocked(input) {
  some period
  period := input.model_before.effective_at
  closed_periods[_] == substr(period, 0, 7)
}
