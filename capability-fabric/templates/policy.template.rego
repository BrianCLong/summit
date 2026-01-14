package summit.capability

default allow = false

allow {
  input.identity.scopes[_] == "<scope>"
  input.context.approval == true
}
