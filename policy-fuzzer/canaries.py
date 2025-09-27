"""Seeded canaries for the policy-fuzzer."""

CANARIES = [
    {
        "policy": {"consent": "user_data", "geo": "US"},
        "query": {"data": "user_data", "location": "EU"},
        "should_fail": True,
    }
]
