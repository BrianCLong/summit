package summit.capability.mcp_invoke

import rego.v1

default allow := false

allow if {
  "mcp:invoke" in input.subjectAttributes.scopes
}
