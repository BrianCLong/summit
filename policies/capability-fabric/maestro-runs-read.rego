package summit.capability.maestro_runs_read
import rego.v1

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "run_maestro"
}
