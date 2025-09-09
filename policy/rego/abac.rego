package access

# input: { user: { id, roles, mfa_level }, action, resource: { owner, tier } }
allow {
  # owners can access their own resources
  input.user.id == input.resource.owner
}
allow {
  # admins can access tier<=2 without step-up
  input.user.roles[_] == "admin"
  input.resource.tier <= 2
}
allow {
  # tier 3 requires step-up MFA
  input.resource.tier == 3
  input.user.mfa_level >= 2
}