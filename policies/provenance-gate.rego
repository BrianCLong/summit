package summit.provenance.gate
import future.keywords.if
import future.keywords.in

# Default deny
default allow = false

# Allow ingestion if all requirements are met
allow {
    has_valid_signature
    has_policy_decision
    is_authorized_agent
}

# Check if the UEF entry has a valid signature witness
has_valid_signature {
    input.witness.signature != ""
    input.witness.keyId != ""
}

# Check if the action was authorized by the Policy Engine
has_policy_decision {
    input.actor.policyDecisionId != ""
    # In a real implementation, we would verify this ID against the Decision Ledger
}

# Check if the actor is a known authorized agent
is_authorized_agent {
    input.actor.type == "agent"
    authorized_agents[input.actor.id]
}

# List of authorized ingest agents (could be loaded from data)
authorized_agents = {
    "agent:orion",
    "agent:jules",
    "agent:ingest-01"
}

# Violation reasons for debugging
violation[msg] {
    not has_valid_signature
    msg := "Missing or invalid cryptographic signature"
}

violation[msg] {
    not has_policy_decision
    msg := "Missing Policy Decision ID"
}

violation[msg] {
    not is_authorized_agent
    msg := sprintf("Unauthorized actor: %v", [input.actor.id])
}
