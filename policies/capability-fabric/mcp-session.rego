package summit.capability.mcp_session

import rego.v1

default allow := false

allow if {
  "mcp:session" in input.subjectAttributes.scopes
}
