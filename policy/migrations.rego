package intelgraph.migrations
import future.keywords.if
import future.keywords.in

default allow := false

# Migrations can only be run by admin or cicd bot
allow if {
  input.user.role == "admin"
}

allow if {
  input.user.role == "cicd"
  input.context.environment != "production"
}

# Production migrations require explicit approval (simulated check)
allow if {
  input.user.role == "cicd"
  input.context.environment == "production"
  # Validating that approval comes from a trusted source/signature
  input.resource.approved == true
  has_valid_approval_signature
}

has_valid_approval_signature if {
  # Mock signature verification - in production this would check input.resource.approval_signature
  input.resource.approval_signature != ""
  input.resource.approval_signer == "security-admin"
}
