package summit.capability.mcp_session
import future.keywords.if
import future.keywords.in

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "mcp:session"
}
