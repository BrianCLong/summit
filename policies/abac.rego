package abac

import future.keywords

default allow = false

allow {
  input.user.role == "admin"
}

allow {
  not ("pii" in input.resource.labels)
}
