package maestro.deploy
import future.keywords.if
import future.keywords.in

# Allow dev deploys only from maintainers and CI bots
allow {
  input.env == "dev"
  some role
  role := input.actor.role
  role == "maintainer" or role == "ci-bot"
}

deny[msg] {
  not allow
  msg := sprintf("deploy denied: env=%v actor=%v", [input.env, input.actor.user])
}