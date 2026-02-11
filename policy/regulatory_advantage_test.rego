import future.keywords.in
import future.keywords.if
package summit.regulatory

test_deny_missing_jurisdiction if {
    test_input := {
        "kind": "DeploymentConfig",
        "config": {
            "region": "us-east-1"
        }
    }
    deny[msg] with input as test_input
    msg == "Regulatory Violation: Missing 'jurisdiction' toggle in deployment configuration. See strategy/REGULATORY_ADVANTAGE.md#5"
}

test_allow_with_jurisdiction if {
    test_input := {
        "kind": "DeploymentConfig",
        "config": {
            "region": "us-east-1",
            "jurisdiction": "US_FED"
        }
    }
    denials := deny with input as test_input
    count(denials) == 0
}

test_deny_sensitive_op_without_audit if {
    test_input := {
        "operation": {
            "sensitivity": "high"
        },
        "config": {
            "audit_logging_enabled": false
        }
    }
    deny[msg] with input as test_input
    msg == "Regulatory Violation: Audit logging must be enabled for high-sensitivity operations. See strategy/REGULATORY_ADVANTAGE.md#5"
}

test_deny_private_meeting_no_legal if {
    test_input := {
        "interaction": {
            "type": "regulator_meeting",
            "private": true,
            "legal_clearance": false
        }
    }
    deny[msg] with input as test_input
    msg == "Clean Hands Violation: Private regulator meetings require prior legal clearance. See strategy/REGULATORY_ADVANTAGE.md#2"
}
