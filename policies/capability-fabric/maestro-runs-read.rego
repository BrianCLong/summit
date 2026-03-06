package summit.capability.maestro_runs_read

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "run_maestro"
}
