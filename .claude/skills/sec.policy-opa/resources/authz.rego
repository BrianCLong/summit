package summit.authz

default allow = false

allow {
  input.tenant == input.resource.tenant
  input.user.roles[_] == "viewer"
}
