package summit.capability.maestro_runs_read

import future.keywords.if
import future.keywords.in
import future.keywords.contains

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "run_maestro"
}
