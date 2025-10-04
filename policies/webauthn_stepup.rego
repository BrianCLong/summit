package webauthn_stepup

import future.keywords.contains
import future.keywords.if
import future.keywords.in

# Default deny step-up requirement
default requires_stepup := false

# Risky routes that require step-up authentication
risky_routes := {
    "/api/export",
    "/api/delete",
    "/api/admin/users",
    "/api/admin/permissions",
    "/api/graphql/mutation/delete",
    "/api/graphql/mutation/export",
    "/api/config/update",
    "/api/secrets/create",
    "/api/secrets/update",
    "/api/credentials/rotate",
}

# Risky GraphQL mutations that require step-up
risky_mutations := {
    "deleteEntity",
    "exportData",
    "updateUserPermissions",
    "createSecret",
    "rotateCredentials",
    "updateSystemConfig",
}

# Check if route requires step-up
requires_stepup if {
    input.request.path in risky_routes
}

# Check if GraphQL mutation requires step-up
requires_stepup if {
    input.request.path == "/api/graphql"
    input.request.method == "POST"
    some mutation in risky_mutations
    contains(input.request.body.query, mutation)
}

# Allow request if step-up authentication is present and valid
allow if {
    not requires_stepup
}

allow if {
    requires_stepup
    input.stepup_auth.present == true
    input.stepup_auth.verified == true
    input.stepup_auth.timestamp > time.now_ns() - 300000000000  # 5 minutes
}

# Generate denial reason with explanation
denial_reason := reason if {
    requires_stepup
    not input.stepup_auth.present
    reason := {
        "blocked": true,
        "reason": "Step-up authentication required for this operation",
        "required_action": "webauthn_stepup",
        "route": input.request.path,
        "help": "This is a high-risk operation. Please authenticate with your security key or biometric device.",
    }
}

denial_reason := reason if {
    requires_stepup
    input.stepup_auth.present == true
    not input.stepup_auth.verified
    reason := {
        "blocked": true,
        "reason": "Step-up authentication failed verification",
        "required_action": "retry_webauthn_stepup",
        "route": input.request.path,
        "help": "Your authentication attempt was not successful. Please try again.",
    }
}

denial_reason := reason if {
    requires_stepup
    input.stepup_auth.present == true
    input.stepup_auth.verified == true
    input.stepup_auth.timestamp <= time.now_ns() - 300000000000  # Expired
    reason := {
        "blocked": true,
        "reason": "Step-up authentication expired (valid for 5 minutes)",
        "required_action": "webauthn_stepup",
        "route": input.request.path,
        "help": "Your authentication has expired. Please authenticate again.",
    }
}

# Audit evidence for allowed requests with step-up
audit_evidence := evidence if {
    allow
    requires_stepup
    evidence := {
        "action": "allowed_with_stepup",
        "route": input.request.path,
        "user": input.user.id,
        "stepup_auth": {
            "timestamp": input.stepup_auth.timestamp,
            "credential_id": input.stepup_auth.credential_id,
            "authenticator_data": input.stepup_auth.authenticator_data,
            "attestation_reference": input.stepup_auth.attestation_reference,
        },
        "policy": "webauthn_stepup.rego",
        "timestamp": time.now_ns(),
    }
}

# Audit evidence for denied requests
audit_evidence := evidence if {
    not allow
    requires_stepup
    evidence := {
        "action": "denied_missing_stepup",
        "route": input.request.path,
        "user": input.user.id,
        "denial_reason": denial_reason,
        "policy": "webauthn_stepup.rego",
        "timestamp": time.now_ns(),
    }
}

# DLP policy bindings - detect sensitive data patterns
dlp_violation := violation if {
    input.request.path in risky_routes
    some pattern in sensitive_data_patterns
    contains(input.request.body, pattern)
    violation := {
        "detected": true,
        "pattern": pattern,
        "action": "block_or_redact",
        "route": input.request.path,
    }
}

sensitive_data_patterns := {
    "SSN",
    "Social Security",
    "Credit Card",
    "API_KEY",
    "SECRET",
    "PASSWORD",
    "PRIVATE_KEY",
}
