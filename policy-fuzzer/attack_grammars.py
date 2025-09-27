"""Attack grammars for the policy-fuzzer."""

ATTACK_GRAMMARS = {
    "synonym_dodges": {
        "user_data": ["user-data", "user_information", "personal_data"],
        "marketing": ["ads", "promotions"],
        "license_A": ["licence_A", "licenseA"],
    },
    "regex_dodges": {
        "geo": [
            "US.*",
            "EU|CA",
            "(US|CA)",
            "[^E]U", # Matches anything ending in U but not starting with E
        ],
        "retention_period": [
            "[0-9]+d", # e.g., 30d
            "[0-9]+m", # e.g., 12m
        ]
    },
    "time_window_boundary_hops": [
        {"offset": -1, "unit": "day"}, # One day before start
        {"offset": 1, "unit": "day"},  # One day after end
        {"offset": 0, "unit": "hour"}, # Same day, different hour
    ],
    "field_aliasing": {
        "location": ["loc", "region", "country"],
        "data": ["dataset", "data_type"],
        "license": ["lic", "licence"],
        "retention": ["keep_for", "store_until"],
        "start_date": ["valid_from", "effective_date"],
        "end_date": ["valid_until", "expiry_date"],
    },
}
