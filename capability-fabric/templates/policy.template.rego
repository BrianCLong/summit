package summit.capability

default allow = false

allow {
  input.subjectAttributes.scopes[_] == "<scope>"
}
