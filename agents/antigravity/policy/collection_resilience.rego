package antigravity.collection

default action := "allow"

# Inputs expected:
# input.request: {service, method, version_pinned}
# input.crawl: {source_tier, robots_allows, exception_id}
# input.metrics: {contested_source_provider_share}
# input.thresholds.collection.max_contested_provider_share

deprecated_dv360_method_prefixes := [
  "advertisers.campaigns.targetingTypes.assignedTargetingOptions",
  "advertisers.insertionOrders.targetingTypes.assignedTargetingOptions",
]

hard_stop[msg] {
  input.request.service == "dv360"
  method := input.request.method
  some i
  prefix := deprecated_dv360_method_prefixes[i]
  startswith(method, prefix)
  msg := sprintf("deprecated dv360 method called: %s", [method])
}

hard_stop["merchant api request must pin version"] {
  input.request.service == "merchant-api"
  input.request.version_pinned != true
}

hard_stop["high-risk crawl requires approved exception_id"] {
  input.crawl.source_tier == "high-risk/contested"
  not input.crawl.exception_id
}

hard_stop["crawl denied by robots policy"] {
  input.crawl.robots_allows == false
}

action := "deny" {
  hard_stop[_]
}

alert[msg] {
  share := object.get(input.metrics, "contested_source_provider_share", 0)
  threshold := object.get(input.thresholds.collection, "max_contested_provider_share", 0.40)
  share > threshold
  msg := sprintf("contested provider concentration above threshold: %.2f", [share])
}
