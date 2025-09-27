"""Seeded canaries for the policy-fuzzer."""

CANARIES = [
    {
        "policy": {"consent": "user_data", "geo": "US"},
        "query": {"data": "user_data", "location": "EU"},
        "should_fail": True,
    },
    {
        "policy": {
            "data": "classified_data",
            "retention": "1y",
            "geo": "warzone_alpha",
            "user_role": "admin"
        },
        "query": {
            "data": "classified_data",
            "retention": "1y",
            "location": "warzone_alpha",
            "user_role": "admin"
        },
        "should_fail": False, # This should be compliant
    },
    {
        "policy": {
            "data": "classified_data",
            "retention": "1y",
            "geo": "warzone_alpha",
            "user_role": "admin"
        },
        "query": {
            "data": "classified_data",
            "retention": "6m", # Shorter retention, should fail
            "location": "warzone_alpha",
            "user_role": "admin"
        },
        "should_fail": True, # This should fail due to retention mismatch
    },
    {
        "policy": {
            "data": "interstellar_data",
            "retention": "infinite",
            "geo": "multiverse_nexus",
            "user_role": "nexus_sovereign",
            "network_condition": "quantum_entangled"
        },
        "query": {
            "data": "interstellar_data",
            "retention": "infinite",
            "location": "multiverse_nexus",
            "user_role": "nexus_sovereign",
            "network_condition": "quantum_entangled"
        },
        "should_fail": False, # This should be compliant
    },
    {
        "policy": {
            "data": "interstellar_data",
            "retention": "infinite",
            "geo": "multiverse_nexus",
            "user_role": "nexus_sovereign",
            "network_condition": "quantum_entangled"
        },
        "query": {
            "data": "interstellar_data",
            "retention": "1y", # Shorter retention, should fail
            "location": "multiverse_nexus",
            "user_role": "nexus_sovereign",
            "network_condition": "quantum_entangled"
        },
        "should_fail": True, # This should fail due to retention mismatch
    },
    {
        "policy": {
            "data": "omniversal_core_data",
            "retention": "eternity",
            "geo": "big_bang_genesis",
            "user_role": "apotheosis_harbinger",
            "network_condition": "transcendent_network"
        },
        "query": {
            "data": "omniversal_core_data",
            "retention": "eternity",
            "location": "big_bang_genesis",
            "user_role": "apotheosis_harbinger",
            "network_condition": "transcendent_network"
        },
        "should_fail": False, # This should be compliant
    },
    {
        "policy": {
            "data": "omniversal_core_data",
            "retention": "eternity",
            "geo": "big_bang_genesis",
            "user_role": "apotheosis_harbinger",
            "network_condition": "transcendent_network"
        },
        "query": {
            "data": "omniversal_core_data",
            "retention": "1000y", # Shorter retention, should fail
            "location": "big_bang_genesis",
            "user_role": "apotheosis_harbinger",
            "network_condition": "transcendent_network"
        },
        "should_fail": True, # This should fail due to retention mismatch
    }
]
