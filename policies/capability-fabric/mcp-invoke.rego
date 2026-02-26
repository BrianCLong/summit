import future.keywords.if
import future.keywords.in
import future.keywords.contains
package summit.capability.mcp_invoke

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "mcp:invoke"
}
