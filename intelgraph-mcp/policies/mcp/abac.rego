package intelgraph.mcp

import future.keywords.if

default allow := false

allow if {
  input.action == "invoke"
  tenant := input.tenant
  tool := input.tool
  scopes := input.capability_scopes
  purpose := input.purpose
  allowed_tool(tenant, tool)
  scope_allows(scopes, purpose)
}

allow if {
  input.action == "stream"
  net_allowed(input.tenant, input.destination)
}

allowed_tool(tenant, tool) if {
  allowed := data.manifests[tenant].tools
  allowed[tool]
}

scope_allows(scopes, purpose) if {
  purposes := {p | scope := scopes[_]; p := data.purposes[scope][_]} 
  purpose == "ops"; purposes[purpose]
}

net_allowed(tenant, destination) if {
  exceptions := data.egress_exceptions[tenant]
  exceptions[destination]
}
