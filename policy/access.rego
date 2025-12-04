package summit.access

default allow = false

allow {
  input.actor.type == "user"
  some r
  input.actor.roles[r] == "governance-admin"
}

allow {
  input.actor.type == "service"
  some r
  input.actor.roles[r] == "governance-bot"
}
