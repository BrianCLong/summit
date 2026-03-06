import future.keywords.in
import future.keywords.if
package maestro.deploy

# Allow dev deploys only from maintainers and CI bots
allow if {
  input.env == "dev"
  some role in input.actor.roles
  role in ["maintainer", "ci-bot"]
}

deny[msg] if {
  not allow
  msg := sprintf("deploy denied: env=%v actor=%v", [input.env, input.actor.user])
}
