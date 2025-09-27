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
    }
]
