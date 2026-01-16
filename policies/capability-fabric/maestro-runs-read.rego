package summit.capability.maestro_runs_read

default allow = false

allow {
  input.identity.scopes[_] == "run_maestro"
}
