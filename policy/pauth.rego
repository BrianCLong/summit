package pauth.cicd

import future.keywords.if
import future.keywords.in
import future.keywords.contains

# Policy-as-Code for CI/CD Authentication and Authorization
# Enforces least privilege for automation tokens

# Deny if token has 'admin' permissions (Harden: Recommendation #4)
deny contains msg if {
	some perm in input.token.permissions
	perm == "admin"
	msg := "Token has excessive permissions: 'admin' is prohibited"
}

# Deny if token has 'write-all' permissions
deny contains msg if {
	input.token.permissions == "write-all"
	msg := "Token has excessive permissions: 'write-all' is prohibited"
}

# Enforce scoped permissions for specific jobs (example)
deny contains msg if {
	input.job.name == "deploy"
	not "deployer" in input.token.roles
	msg := "Deploy job requires 'deployer' role"
}
