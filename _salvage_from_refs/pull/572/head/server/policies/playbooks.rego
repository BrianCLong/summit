package playbooks

default allow = false

allow {
  input.action == "external"
  input.approved == true
}
