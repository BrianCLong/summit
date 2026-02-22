
package governance_test
import future.keywords.if

import data.governance

test_allow_safe if {
    test_input := {
        "risk_score": 20,
        "sector": "healthcare",
        "guardrail_check": {"allowed": true}
    }
    governance.allow with input as test_input
}

test_deny_high_risk if {
    test_input := {
        "risk_score": 95,
        "mitigation": "NONE"
    }
    not governance.allow with input as test_input
    governance.any_violations with input as test_input
    governance.violation["high_risk_use_case"] with input as test_input
}

test_deny_disallowed_sector if {
    test_input := {
        "sector": "gambling"
    }
    not governance.allow with input as test_input
    governance.violation["disallowed_sector"] with input as test_input
}

test_deny_guardrail_breach if {
    test_input := {
        "guardrail_check": {"allowed": false}
    }
    not governance.allow with input as test_input
    governance.violation["guardrail_breach"] with input as test_input
}

test_mitigation_levels if {
    governance.mitigation == "DENY" with input as {"risk_score": 95}
    governance.mitigation == "REVIEW" with input as {"risk_score": 75}
    governance.mitigation == "RESTRICT" with input as {"risk_score": 55}
    governance.mitigation == "PHILANTHROPIC_OFFSET" with input as {"risk_score": 35}
    governance.mitigation == "NONE" with input as {"risk_score": 10}
}
