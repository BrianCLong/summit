package intelgraph.marketplace

default allow_purchase = false

allow_purchase {
  input.sku.templateId == input.request.templateId
  input.sku.ttlDays <= 30
  input.request.region == input.sku.region[_]
  not input.sku.customQuery
}

deny_reason[msg] {
  not allow_purchase
  msg := "sku_policy_denied"
}
