package summit.capability.mcp_invoke

default allow = false

allow {
  input.identity.scopes[_] == "mcp:invoke"
}
