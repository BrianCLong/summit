package summit.capability.maestro_runs_read
import future.keywords.contains
import future.keywords.if
import future.keywords.in

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "run_maestro"
}
