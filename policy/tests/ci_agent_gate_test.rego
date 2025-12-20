package ci_agent_gate_test

import data.ci_agent_gate
import future.keywords.if
import future.keywords.in

# Test: Allow non-agent user
test_allow_user if {
    input_data := {
        "user": {
            "type": "USER",
            "name": "human",
            "tier": "admin"
        },
        "changes": [
            {"file": "policy/ci_gate.rego"}
        ]
    }
    count(ci_agent_gate.deny) == 0 with input as input_data
}

# Test: Deny low-tier agent on protected path
test_deny_low_tier_protected if {
    input_data := {
        "user": {
            "type": "AGENT",
            "name": "agent-low",
            "tier": "tier-1"
        },
        "changes": [
            {"file": "policy/ci_gate.rego"}
        ]
    }
    denials := ci_agent_gate.deny with input as input_data
    count(denials) > 0
    contains_msg(denials, "not allowed to modify protected path")
}

# Test: Allow tier-4 agent on protected path
test_allow_tier4_protected if {
    input_data := {
        "user": {
            "type": "AGENT",
            "name": "agent-critical",
            "tier": "tier-4"
        },
        "changes": [
            {"file": "policy/ci_gate.rego"}
        ]
    }
    count(ci_agent_gate.deny) == 0 with input as input_data
}

# Test: Deny unknown tier
test_deny_unknown_tier if {
    input_data := {
        "user": {
            "type": "AGENT",
            "name": "agent-weird",
            "tier": "unknown-tier"
        },
        "changes": [
            {"file": "src/app.ts"}
        ]
    }
    denials := ci_agent_gate.deny with input as input_data
    count(denials) > 0
    contains_msg(denials, "unknown permission tier")
}

# Test: Allow low-tier agent on non-protected path
test_allow_low_tier_normal if {
    input_data := {
        "user": {
            "type": "AGENT",
            "name": "agent-low",
            "tier": "tier-1"
        },
        "changes": [
            {"file": "src/app.ts"}
        ]
    }
    count(ci_agent_gate.deny) == 0 with input as input_data
}

# Helper to check partial message match
contains_msg(denials, part) if {
    some d in denials
    contains(d, part)
}
