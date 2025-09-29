package plugins

default allow = false

allow {
  input.capability in input.allowed
}
