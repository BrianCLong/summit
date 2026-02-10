package maestro.deploy

# Allow dev deploys only from maintainers and CI bots
allow if {
  input.env == "dev"
  some role
  role := input.actor.role
  role in {"maintainer", "ci-bot"}
}

deny[msg] {
  not allow
  msg := sprintf("deploy denied: env=%v actor=%v", [input.env, input.actor.user])
}