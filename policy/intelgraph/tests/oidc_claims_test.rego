# Tests for oidc-claims.rego

package intelgraph.oidc_test

import future.keywords.if
import future.keywords.in

import data.intelgraph.oidc

# ── Positive: valid OIDC token ───────────────────────────────

test_allow_valid_token if {
	oidc.allow with input as {
		"user": {
			"oidcClaims": {
				"sub": "user-123",
				"iss": "https://auth.intelgraph.dev/realms/main",
				"aud": "intelgraph-api",
				"exp": 9999999999,
				"email_verified": true,
				"groups": ["analysts"],
			},
		},
		"currentTimestamp": 1700000000,
		"expectedAudience": "intelgraph-api",
	}
}

test_allow_google_issuer if {
	oidc.allow with input as {
		"user": {
			"oidcClaims": {
				"sub": "user-456",
				"iss": "https://accounts.google.com",
				"aud": "intelgraph-api",
				"exp": 9999999999,
				"email_verified": true,
			},
		},
		"currentTimestamp": 1700000000,
		"expectedAudience": "intelgraph-api",
	}
}

test_allow_azure_issuer if {
	oidc.allow with input as {
		"user": {
			"oidcClaims": {
				"sub": "user-789",
				"iss": "https://login.microsoftonline.com/tenant-id/v2.0",
				"aud": "intelgraph-api",
				"exp": 9999999999,
				"email_verified": true,
			},
		},
		"currentTimestamp": 1700000000,
		"expectedAudience": "intelgraph-api",
	}
}

# ── Negative: invalid tokens ────────────────────────────────

test_deny_expired_token if {
	not oidc.allow with input as {
		"user": {
			"oidcClaims": {
				"sub": "user-123",
				"iss": "https://auth.intelgraph.dev/realms/main",
				"aud": "intelgraph-api",
				"exp": 1600000000,
				"email_verified": true,
			},
		},
		"currentTimestamp": 1700000000,
		"expectedAudience": "intelgraph-api",
	}
}

test_deny_untrusted_issuer if {
	not oidc.allow with input as {
		"user": {
			"oidcClaims": {
				"sub": "user-123",
				"iss": "https://evil.example.com",
				"aud": "intelgraph-api",
				"exp": 9999999999,
				"email_verified": true,
			},
		},
		"currentTimestamp": 1700000000,
		"expectedAudience": "intelgraph-api",
	}
}

test_deny_audience_mismatch if {
	not oidc.allow with input as {
		"user": {
			"oidcClaims": {
				"sub": "user-123",
				"iss": "https://auth.intelgraph.dev/realms/main",
				"aud": "wrong-audience",
				"exp": 9999999999,
				"email_verified": true,
			},
		},
		"currentTimestamp": 1700000000,
		"expectedAudience": "intelgraph-api",
	}
}

# ── Edge cases ───────────────────────────────────────────────

test_deny_missing_subject if {
	not oidc.allow with input as {
		"user": {
			"oidcClaims": {
				"sub": "",
				"iss": "https://auth.intelgraph.dev/realms/main",
				"aud": "intelgraph-api",
				"exp": 9999999999,
				"email_verified": true,
			},
		},
		"currentTimestamp": 1700000000,
		"expectedAudience": "intelgraph-api",
	}
}

test_deny_reasons_expired if {
	"token_expired" in oidc.deny with input as {
		"user": {
			"oidcClaims": {
				"sub": "user-123",
				"iss": "https://auth.intelgraph.dev",
				"aud": "intelgraph-api",
				"exp": 1600000000,
			},
		},
		"currentTimestamp": 1700000000,
		"expectedAudience": "intelgraph-api",
	}
}

test_deny_reasons_untrusted if {
	"untrusted_issuer" in oidc.deny with input as {
		"user": {
			"oidcClaims": {
				"sub": "user-123",
				"iss": "https://evil.example.com",
				"aud": "intelgraph-api",
				"exp": 9999999999,
			},
		},
		"currentTimestamp": 1700000000,
		"expectedAudience": "intelgraph-api",
	}
}

test_group_membership if {
	oidc.in_group("analysts") with input as {
		"user": {
			"oidcClaims": {
				"groups": ["analysts", "viewers"],
			},
		},
	}
}

test_no_group_membership if {
	not oidc.in_group("admins") with input as {
		"user": {
			"oidcClaims": {
				"groups": ["analysts", "viewers"],
			},
		},
	}
}
