package agent_archetypes

import future.keywords

default allow = false

allow {
  input.user.role == "chief_of_staff"
}
