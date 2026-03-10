package maestro.deploy
import rego.v1

# Allow dev deploys only from maintainers and CI bots
allow if {
  input.env == "dev"
  some role
  role := input.actor.role
  role == "maintainer" or role == "ci-bot"
}

deny contains msg if {
  not allow
  msg := sprintf("deploy denied: env=%v actor=%v", [input.env, input.actor.user])
}