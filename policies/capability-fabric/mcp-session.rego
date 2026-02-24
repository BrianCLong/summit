package summit.capability.mcp_session

import future.keywords

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "mcp:session"
}
