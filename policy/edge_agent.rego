package edge_ops

default allow_deployment = false
default allow_action = false

# Allow deployment if agent has SLSA Level 3 proof and environment is not denied
# OR if environment is denied but agent is strictly verified and capabilities are limited

# Check SLSA level
allow_deployment {
    input.agent.slsa_level >= 3
    input.environment.type != "DENIED"
}

# In denied environments, require SLSA Level 3 AND signed authorization
allow_deployment {
    input.agent.slsa_level >= 3
    input.environment.type == "DENIED"
    input.agent.is_signed_by_admin == true
    input.capabilities.has_external_network_access == false
}

# Action policy:
# Allow CTI/Influence Mapping actions if the fleet is deployed and mission matches
allow_action {
    input.fleet.status == "DEPLOYED"
    input.mission.type == "INFLUENCE_MAPPING"
    input.action.type == "COLLECT_DATA"
}

allow_action {
    input.fleet.status == "DEPLOYED"
    input.mission.type == "INFLUENCE_MAPPING"
    input.action.type == "ANALYZE_CONTENT"
}

# Deny any "ACTIVE" operations (like posting content) in denied environments without explicit override
allow_action {
    input.environment.type == "DENIED"
    input.action.type == "POST_CONTENT"
    input.override_authorized == true
}
