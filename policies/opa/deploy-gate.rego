package maestro.deploy

# Allow dev deploys only from maintainers and CI bots
allow {
  input.env == "dev"
  input.actor.role == "maintainer"
}

allow {
  input.env == "dev"
  input.actor.role == "ci-bot"
}

deny[msg] {
  not allow
  msg := sprintf("deploy denied: env=%v actor=%v", [input.env, input.actor.user])
}