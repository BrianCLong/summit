package summit.regulatory

test_deny_missing_jurisdiction if {
    input := {
        "kind": "DeploymentConfig",
        "config": {
            "region": "us-east-1"
        }
    }
    deny[msg] with input as input
    msg == "Regulatory Violation: Missing 'jurisdiction' toggle in deployment configuration. See strategy/REGULATORY_ADVANTAGE.md#5"
}

test_allow_with_jurisdiction if {
    input := {
        "kind": "DeploymentConfig",
        "config": {
            "region": "us-east-1",
            "jurisdiction": "US_FED"
        }
    }
    count(deny) == 0 with input as input
}

test_deny_sensitive_op_without_audit if {
    input := {
        "operation": {
            "sensitivity": "high"
        },
        "config": {
            "audit_logging_enabled": false
        }
    }
    deny[msg] with input as input
    msg == "Regulatory Violation: Audit logging must be enabled for high-sensitivity operations. See strategy/REGULATORY_ADVANTAGE.md#5"
}

test_deny_private_meeting_no_legal if {
    input := {
        "interaction": {
            "type": "regulator_meeting",
            "private": true,
            "legal_clearance": false
        }
    }
    deny[msg] with input as input
    msg == "Clean Hands Violation: Private regulator meetings require prior legal clearance. See strategy/REGULATORY_ADVANTAGE.md#2"
}
