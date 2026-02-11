import future.keywords
package maestro.routing
default allow = false

allow {
  input.step_tags[_] == "pii"
  input.selected_model == "ig-local-70b"
}

allow {
  not input.step_tags[_] == "pii"
}
