package summit.capability.mcp_invoke

import future.keywords.if
import future.keywords.in
import future.keywords.contains

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "mcp:invoke"
}
