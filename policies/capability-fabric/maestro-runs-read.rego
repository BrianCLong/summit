import future.keywords.if
import future.keywords.in
import future.keywords.contains
package summit.capability.maestro_runs_read

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "run_maestro"
}
