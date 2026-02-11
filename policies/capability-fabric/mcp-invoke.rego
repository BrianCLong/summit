package summit.capability.mcp_invoke
import future.keywords.contains
import future.keywords.if
import future.keywords.in

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "mcp:invoke"
}
