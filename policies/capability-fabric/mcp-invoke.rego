package summit.capability.mcp_invoke
import rego.v1

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "mcp:invoke"
}
