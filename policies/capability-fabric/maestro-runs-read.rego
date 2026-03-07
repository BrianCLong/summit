package summit.capability.maestro_runs_read

import rego.v1

default allow := false

allow if {
  "run_maestro" in input.subjectAttributes.scopes
}
