package maestro.placement
violation[reason] {
  input.country == "EU"
  input.region != "eu-west"
  reason := sprintf("EU data must run in eu-west, not %s", [input.region])
}