# OIDC Claims-Based Authorization for IntelGraph
# Validates identity tokens and enforces claim-based access. Deny-by-default.

package intelgraph.oidc

import future.keywords.contains
import future.keywords.if
import future.keywords.in

default allow := false

# ── Trusted issuers ──────────────────────────────────────────

trusted_issuers := {
	"https://login.microsoftonline.com/",
	"https://accounts.google.com",
	"https://auth.intelgraph.dev",
}

# ── Allow rules ──────────────────────────────────────────────

# Allow when token is valid, issuer trusted, not expired, and audience matches
allow if {
	valid_token
	trusted_issuer
	not token_expired
	audience_matches
}

# ── Token validation helpers ─────────────────────────────────

valid_token if {
	input.user.oidcClaims.sub != ""
	input.user.oidcClaims.iss != ""
	input.user.oidcClaims.aud != ""
	input.user.oidcClaims.exp != 0
}

trusted_issuer if {
	some issuer in trusted_issuers
	startswith(input.user.oidcClaims.iss, issuer)
}

token_expired if {
	input.user.oidcClaims.exp < input.currentTimestamp
}

audience_matches if {
	input.user.oidcClaims.aud == input.expectedAudience
}

# ── Claim-based authorization ────────────────────────────────

# User has a specific claim value
has_claim(key, value) if {
	input.user.oidcClaims[key] == value
}

# User has a group membership
in_group(group) if {
	group in input.user.oidcClaims.groups
}

# User has email-verified status
email_verified if {
	input.user.oidcClaims.email_verified == true
}

# ── Deny rules ───────────────────────────────────────────────

deny contains "missing_token" if {
	not input.user.oidcClaims
}

deny contains "missing_subject" if {
	input.user.oidcClaims
	not input.user.oidcClaims.sub
}

deny contains "missing_subject" if {
	input.user.oidcClaims.sub == ""
}

deny contains "untrusted_issuer" if {
	input.user.oidcClaims.iss
	not trusted_issuer
}

deny contains "token_expired" if {
	token_expired
}

deny contains "audience_mismatch" if {
	input.user.oidcClaims.aud
	input.expectedAudience
	not audience_matches
}

deny contains "email_not_verified" if {
	input.user.oidcClaims
	not email_verified
}

# ── Decision bundle ──────────────────────────────────────────

decision := {
	"allow": allow,
	"deny": deny,
}
