package summit.capability.maestro_runs_read
import future.keywords

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "run_maestro"
}
