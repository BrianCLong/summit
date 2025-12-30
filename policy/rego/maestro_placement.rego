package maestro.placement

import future.keywords.if
import future.keywords.contains

violation contains reason if {
  input.country == "EU"
  input.region != "eu-west"
  reason := sprintf("EU data must run in eu-west, not %s", [input.region])
}
