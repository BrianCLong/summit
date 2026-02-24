package summit.capability.mcp_session
import future.keywords.contains
import future.keywords.if
import future.keywords.in

import future.keywords

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "mcp:session"
}
