package osint.tos

default allow = false

deny["source_not_registered"] if {
  not input.source_registry[input.collection.source_id]
}

deny["method_not_allowed"] if {
  source := input.source_registry[input.collection.source_id]
  method := input.collection.method
  not method_allowed(source.allowed_methods, method)
}

deny["method_explicitly_disallowed"] if {
  source := input.source_registry[input.collection.source_id]
  method := input.collection.method
  method_allowed(source.disallowed_methods, method)
}

deny["disallowed_tos_method"] if {
  input.collection.method == "circumvent"
}

deny["disallowed_tos_method"] if {
  input.collection.method == "credential_share"
}

deny["disallowed_tos_method"] if {
  input.collection.method == "paywall_bypass"
}

allow if {
  count(deny) == 0
}

method_allowed(methods, method) {
  methods[_] == method
}
