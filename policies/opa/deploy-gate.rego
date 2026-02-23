package maestro.deploy

# Allow dev deploys only from maintainers and CI bots
allow {
  input.env == "dev"
  is_authorized_role(input.actor.role)
}

is_authorized_role("maintainer")
is_authorized_role("ci-bot")

deny[msg] {
  not allow
  msg := sprintf("deploy denied: env=%v actor=%v", [input.env, input.actor.user])
}
