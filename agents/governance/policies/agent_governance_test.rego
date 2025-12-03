# Agent Governance OPA Policy Tests
# Run with: opa test policies/ -v

package agents.governance_test

import future.keywords.if
import data.agents.governance

# ============================================================================
# Action Policy Tests
# ============================================================================

test_action_allowed_for_valid_context if {
    governance.action_allowed with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "elevated",
            "classification": "CONFIDENTIAL"
        },
        "action": "analyze",
        "resource": {
            "type": "entity",
            "attributes": {}
        },
        "user": {
            "id": "user-001",
            "clearance": "SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

test_action_denied_for_insufficient_clearance if {
    not governance.action_allowed with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "elevated",
            "classification": "TOP_SECRET"
        },
        "action": "read",
        "resource": {
            "type": "entity",
            "attributes": {}
        },
        "user": {
            "id": "user-001",
            "clearance": "SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

test_action_denied_for_blocked_action if {
    not governance.action_allowed with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "sovereign",
            "classification": "UNCLASSIFIED"
        },
        "action": "exfiltrate",
        "resource": {
            "type": "entity",
            "attributes": {}
        },
        "user": {
            "id": "user-001",
            "clearance": "TOP_SECRET",
            "roles": ["admin"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

test_action_denied_for_untrusted_restricted_action if {
    not governance.action_allowed with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "untrusted",
            "classification": "UNCLASSIFIED"
        },
        "action": "execute",
        "resource": {
            "type": "entity",
            "attributes": {}
        },
        "user": {
            "id": "user-001",
            "clearance": "SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

# ============================================================================
# Trust Level Tests
# ============================================================================

test_trust_level_numeric_conversion if {
    governance.trust_level_num("untrusted") == 0
    governance.trust_level_num("basic") == 1
    governance.trust_level_num("elevated") == 2
    governance.trust_level_num("privileged") == 3
    governance.trust_level_num("sovereign") == 4
}

test_clearance_level_numeric_conversion if {
    governance.clearance_level("UNCLASSIFIED") == 0
    governance.clearance_level("CUI") == 1
    governance.clearance_level("CONFIDENTIAL") == 2
    governance.clearance_level("SECRET") == 3
    governance.clearance_level("TOP_SECRET") == 4
    governance.clearance_level("SCI") == 5
    governance.clearance_level("SAP") == 6
}

# ============================================================================
# Misuse Detection Tests
# ============================================================================

test_misuse_detected_for_suspicious_pattern if {
    governance.misuse_detected with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "basic",
            "classification": "UNCLASSIFIED"
        },
        "action": "export",
        "resource": {
            "type": "entity",
            "attributes": {}
        },
        "user": {
            "id": "user-001",
            "clearance": "SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

test_misuse_detected_for_cross_tenant_violation if {
    governance.misuse_detected with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "elevated",
            "classification": "CONFIDENTIAL"
        },
        "action": "read",
        "resource": {
            "type": "entity",
            "attributes": {
                "tenantId": "other-org"
            }
        },
        "user": {
            "id": "user-001",
            "clearance": "SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

test_no_misuse_for_valid_cross_tenant_admin if {
    not governance.cross_tenant_violation with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "privileged",
            "classification": "SECRET"
        },
        "action": "read",
        "resource": {
            "type": "entity",
            "attributes": {
                "tenantId": "other-org"
            }
        },
        "user": {
            "id": "admin-001",
            "clearance": "TOP_SECRET",
            "roles": ["cross_tenant_admin"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

# ============================================================================
# Chain Policy Tests
# ============================================================================

test_chain_allowed_for_valid_config if {
    governance.chain_allowed with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "elevated",
            "classification": "CONFIDENTIAL"
        },
        "action": "execute_chain",
        "resource": {
            "type": "chain",
            "attributes": {
                "chainId": "chain-001",
                "stepCount": 3,
                "totalCost": 10
            }
        },
        "user": {
            "id": "user-001",
            "clearance": "SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

test_chain_denied_for_excessive_steps if {
    not governance.chain_allowed with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "elevated",
            "classification": "CONFIDENTIAL"
        },
        "action": "execute_chain",
        "resource": {
            "type": "chain",
            "attributes": {
                "chainId": "chain-001",
                "stepCount": 15,
                "totalCost": 10
            }
        },
        "user": {
            "id": "user-001",
            "clearance": "SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

test_chain_denied_for_excessive_cost if {
    not governance.chain_allowed with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "elevated",
            "classification": "CONFIDENTIAL"
        },
        "action": "execute_chain",
        "resource": {
            "type": "chain",
            "attributes": {
                "chainId": "chain-001",
                "stepCount": 3,
                "totalCost": 500
            }
        },
        "user": {
            "id": "user-001",
            "clearance": "SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

# ============================================================================
# Provenance Policy Tests
# ============================================================================

test_provenance_valid_for_slsa3 if {
    governance.provenance_valid with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "elevated",
            "classification": "CONFIDENTIAL"
        },
        "action": "verify_provenance",
        "resource": {
            "type": "artifact",
            "attributes": {
                "provenance": {
                    "slsaLevel": "SLSA_3",
                    "signed": true,
                    "trusted": true
                }
            }
        },
        "user": {
            "id": "user-001",
            "clearance": "SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

test_provenance_invalid_for_slsa1 if {
    not governance.provenance_valid with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "elevated",
            "classification": "CONFIDENTIAL"
        },
        "action": "verify_provenance",
        "resource": {
            "type": "artifact",
            "attributes": {
                "provenance": {
                    "slsaLevel": "SLSA_1",
                    "signed": true,
                    "trusted": true
                }
            }
        },
        "user": {
            "id": "user-001",
            "clearance": "SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

test_provenance_invalid_for_unsigned if {
    not governance.provenance_valid with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "elevated",
            "classification": "CONFIDENTIAL"
        },
        "action": "verify_provenance",
        "resource": {
            "type": "artifact",
            "attributes": {
                "provenance": {
                    "slsaLevel": "SLSA_3",
                    "signed": false,
                    "trusted": true
                }
            }
        },
        "user": {
            "id": "user-001",
            "clearance": "SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

# ============================================================================
# IC FY28 Compliance Tests
# ============================================================================

test_icfy28_compliant_for_full_config if {
    governance.icfy28_compliant with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "elevated",
            "classification": "SECRET"
        },
        "action": "analyze",
        "resource": {
            "type": "entity",
            "attributes": {}
        },
        "user": {
            "id": "user-001",
            "clearance": "TOP_SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }
}

test_icfy28_not_compliant_for_low_slsa if {
    not governance.icfy28_compliant with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "elevated",
            "classification": "SECRET"
        },
        "action": "analyze",
        "resource": {
            "type": "entity",
            "attributes": {}
        },
        "user": {
            "id": "user-001",
            "clearance": "TOP_SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_1"
        }
    }
}

# ============================================================================
# Rate Limiting Tests
# ============================================================================

test_rate_limit_returns_correct_limit_for_trust_level if {
    governance.rate_limit_for_trust_level == 10 with input.agent.trustLevel as "untrusted"
    governance.rate_limit_for_trust_level == 50 with input.agent.trustLevel as "basic"
    governance.rate_limit_for_trust_level == 100 with input.agent.trustLevel as "elevated"
    governance.rate_limit_for_trust_level == 500 with input.agent.trustLevel as "privileged"
    governance.rate_limit_for_trust_level == 1000 with input.agent.trustLevel as "sovereign"
}

# ============================================================================
# Decision Output Tests
# ============================================================================

test_result_includes_required_fields if {
    result := governance.result with input as {
        "agent": {
            "id": "agent-001",
            "fleetId": "fleet-001",
            "trustLevel": "elevated",
            "classification": "CONFIDENTIAL"
        },
        "action": "read",
        "resource": {
            "type": "entity",
            "attributes": {}
        },
        "user": {
            "id": "user-001",
            "clearance": "SECRET",
            "roles": ["analyst"],
            "organization": "org-001"
        },
        "environment": {
            "timestamp": 1700000000,
            "airgapped": false,
            "federalEnvironment": true,
            "slsaLevel": "SLSA_3"
        }
    }

    result.allow != null
    result.reason != null
    result.policy_path != null
    result.audit_level != null
}
