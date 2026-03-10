package summit.capability.mcp_session
import rego.v1

default allow = false

allow if {
  input.subjectAttributes.scopes[_] == "mcp:session"
}
