scenario "lead-routing-enterprise-uk" {
  type      = "lead_routing"
  tenant_id = "tenant-default"
  input_file = "revops_simulation.jsonl"
}

scenario "discount-approval-enterprise" {
  type      = "discount_approval"
  tenant_id = "tenant-default"
  input_file = "revops_simulation.jsonl"
}
