import future.keywords.in
import future.keywords.if
package revops.invariants

# Global guardrails that tenants cannot bypass.

default violations := {}

deny_activation contains reason if {
  input.contract.status != "signed"
  reason := "contract_not_signed"
}

deny_discount contains reason if {
  gmax := data.revops.limits.global_max_discount
  gmax > 0
  input.quote.discount_percentage > gmax
  reason := "exceeds_global_max_discount"
}
