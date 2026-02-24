package summit.capability.mcp_invoke

import future.keywords

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "mcp:invoke"
}
