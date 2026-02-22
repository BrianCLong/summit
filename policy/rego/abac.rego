import future.keywords
package access

# input: { user: { id, roles, mfa_level }, action, resource: { owner, tier } }
allow if {
  # owners can access their own resources
  input.user.id == input.resource.owner
}
allow if {
  # admins can access tier<=2 without step-up
  input.user.roles[_] == "admin"
  input.resource.tier <= 2
}
allow if {
  # tier 3 requires step-up MFA
  input.resource.tier == 3
  input.user.mfa_level >= 2
}
