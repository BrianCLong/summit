# Policy Profiles for Different Risk Levels
# Package: intelgraph.approvals.profiles
#
# Pre-configured policy profiles that can be selected per-tenant

package intelgraph.approvals.profiles
import future.keywords.if
import future.keywords.in



# ===========================================================================
# Standard Profile
# ===========================================================================

standard := {
    "name": "standard",
    "description": "Standard approval workflow for most operations",
    "config": {
        "four_eyes_usd_threshold": 5.0,
        "four_eyes_token_threshold": 100000,
        "default_required_approvals": 2,
        "approval_timeout_hours": 72,
        "allowed_approver_roles": [
            "admin",
            "tenant-admin",
            "team-lead",
            "senior-analyst"
        ]
    }
}

# ===========================================================================
# Strict Production Deploy Profile
# ===========================================================================

strict_prod_deploy := {
    "name": "strict_prod_deploy",
    "description": "Strict approval requirements for production deployments",
    "config": {
        "four_eyes_usd_threshold": 1.0,
        "four_eyes_token_threshold": 50000,
        "default_required_approvals": 2,
        "approval_timeout_hours": 4,
        "require_tests_passed": true,
        "require_security_scan": true,
        "require_rollback_plan": true,
        "allowed_approver_roles": [
            "admin",
            "tenant-admin",
            "security-admin",
            "team-lead"
        ],
        "additional_conditions": [
            {
                "type": "time_window",
                "constraint": "deploy_window",
                "value": "business_hours",
                "description": "Deployments only during business hours"
            },
            {
                "type": "requirement",
                "constraint": "change_ticket",
                "value": "required",
                "description": "Change ticket must be linked"
            }
        ]
    }
}

# ===========================================================================
# High-Risk Finance Profile
# ===========================================================================

high_risk_finance := {
    "name": "high_risk_finance",
    "description": "Enhanced controls for high-value financial operations",
    "config": {
        "four_eyes_usd_threshold": 1000,
        "default_required_approvals": 2,
        "high_value_threshold": 50000,
        "high_value_required_approvals": 3,
        "approval_timeout_hours": 48,
        "require_recipient_verification": true,
        "require_dual_control": true,
        "allowed_approver_roles": [
            "admin",
            "tenant-admin",
            "finance-admin",
            "compliance-officer"
        ],
        "additional_conditions": [
            {
                "type": "verification",
                "constraint": "recipient_kyc",
                "value": "verified",
                "description": "Recipient KYC must be verified"
            },
            {
                "type": "limit",
                "constraint": "daily_limit",
                "value": "500000",
                "description": "Daily aggregate limit of $500,000"
            }
        ]
    }
}

# ===========================================================================
# Emergency Override Profile
# ===========================================================================

emergency_override := {
    "name": "emergency_override",
    "description": "Expedited approval for emergency situations",
    "config": {
        "default_required_approvals": 1,
        "approval_timeout_hours": 1,
        "require_justification": true,
        "require_incident_ticket": true,
        "audit_level": "enhanced",
        "allowed_approver_roles": [
            "admin",
            "tenant-admin",
            "security-admin"
        ],
        "post_approval_requirements": [
            {
                "type": "review",
                "constraint": "post_incident_review",
                "value": "24h",
                "description": "Post-incident review within 24 hours"
            },
            {
                "type": "notification",
                "constraint": "notify_stakeholders",
                "value": "immediate",
                "description": "Notify all stakeholders immediately"
            }
        ]
    }
}

# ===========================================================================
# Compliance-Heavy Profile
# ===========================================================================

compliance_heavy := {
    "name": "compliance_heavy",
    "description": "Maximum compliance controls for regulated operations",
    "config": {
        "four_eyes_usd_threshold": 0,
        "default_required_approvals": 3,
        "approval_timeout_hours": 168,
        "require_compliance_review": true,
        "require_legal_review": true,
        "require_audit_trail": true,
        "retention_period_days": 2555,
        "allowed_approver_roles": [
            "admin",
            "compliance-officer",
            "legal-counsel"
        ],
        "additional_conditions": [
            {
                "type": "review",
                "constraint": "compliance_sign_off",
                "value": "required",
                "description": "Compliance officer sign-off required"
            },
            {
                "type": "documentation",
                "constraint": "full_audit_trail",
                "value": "required",
                "description": "Complete audit trail documentation"
            }
        ]
    }
}

# ===========================================================================
# Profile Selection Helper
# ===========================================================================

# Get profile by name
get_profile(name) := standard if {
    name == "standard"
}

get_profile(name) := strict_prod_deploy if {
    name == "strict_prod_deploy"
}

get_profile(name) := high_risk_finance if {
    name == "high_risk_finance"
}

get_profile(name) := emergency_override if {
    name == "emergency_override"
}

get_profile(name) := compliance_heavy if {
    name == "compliance_heavy"
}

get_profile(name) := standard if {
    not name in {"standard", "strict_prod_deploy", "high_risk_finance", "emergency_override", "compliance_heavy"}
}

# List all available profiles
available_profiles := [
    standard,
    strict_prod_deploy,
    high_risk_finance,
    emergency_override,
    compliance_heavy
]
