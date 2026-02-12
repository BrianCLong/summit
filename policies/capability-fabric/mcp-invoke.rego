package summit.capability.mcp_invoke

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "mcp:invoke"
}
