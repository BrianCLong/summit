package search.filters

default allow = false

default reason = ""

allow {
  not tenant_mismatch
  not disallowed_node_type
  not invalid_date_range
  not invalid_relevance
}

tenant_mismatch {
  input.filters.tenant_id
  input.context.tenant_id
  input.filters.tenant_id != input.context.tenant_id
}

reason = "tenant_mismatch" {
  tenant_mismatch
}

allowed_node_types := {t | t := input.context.allowed_node_types[_]}

disallowed_node_type {
  input.filters.node_types
  count(allowed_node_types) > 0
  some node_type
  node_type := input.filters.node_types[_]
  not allowed_node_type(node_type)
}

allowed_node_type(node_type) {
  allowed_node_types[node_type]
}

reason = "node_type_not_allowed" {
  disallowed_node_type
}

invalid_date_range {
  input.filters.date_range.from
  input.filters.date_range.to
  input.filters.date_range.from > input.filters.date_range.to
}

reason = "invalid_date_range" {
  invalid_date_range
}

invalid_relevance {
  input.filters.min_relevance
  (input.filters.min_relevance < 0 or input.filters.min_relevance > 1)
}

reason = "invalid_relevance" {
  invalid_relevance
}

reason = "" {
  allow
}
