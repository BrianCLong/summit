package collection.policy

deprecated_dv360_method_prefixes := [
  "advertisers.campaigns.targetingTypes.assignedTargetingOptions",
  "advertisers.insertionOrders.targetingTypes.assignedTargetingOptions",
]

required_evidence_fields := [
  "source_url",
  "collected_at_utc",
  "content_hash_sha256",
  "collector_identity",
  "policy_decision_id",
]

is_empty(value) {
  value == null
} else {
  value == ""
}

deny[msg] {
  input.request.service == "dv360"
  method := input.request.method
  some i
  prefix := deprecated_dv360_method_prefixes[i]
  startswith(method, prefix)
  msg := sprintf("deprecated dv360 method called: %s", [method])
}

deny["merchant api request must pin version"] {
  input.request.service == "merchant-api"
  input.request.version_pinned != true
}

deny["high-risk crawl requires approved exception_id"] {
  input.crawl.source_tier == "high-risk/contested"
  not input.crawl.exception_id
}

deny["crawl denied by robots policy"] {
  input.crawl.robots_allows == false
}

deny[msg] {
  field := required_evidence_fields[_]
  value := object.get(input.evidence, field, null)
  is_empty(value)
  msg := sprintf("missing required evidence field: %s", [field])
}

warn[msg] {
  share := object.get(input.metrics, "contested_source_provider_share", 0)
  share > 0.40
  msg := sprintf("contested provider concentration above threshold: %.2f", [share])
}
