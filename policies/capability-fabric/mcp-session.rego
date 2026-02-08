package summit.capability.mcp_session

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "mcp:session"
}
