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
            "[^E]U",  # Matches anything ending in U but not starting with E
        ],
        "retention_period": [
            "[0-9]+d",  # e.g., 30d
            "[0-9]+m",  # e.g., 12m
        ],
    },
    "time_window_boundary_hops": [
        {"offset": -1, "unit": "day"},  # One day before start
        {"offset": 1, "unit": "day"},  # One day after end
        {"offset": 0, "unit": "hour"},  # Same day, different hour
        {"offset": -1, "unit": "week"},  # One week before start
        {"offset": 1, "unit": "week"},  # One week after end
        {"offset": -1, "unit": "month"},  # One month before start
        {"offset": 1, "unit": "month"},  # One month after end
        {
            "offset": 0,
            "unit": "day",
            "timezone_shift": "-05:00",
        },  # Same day, different timezone (e.g., EST)
        {
            "offset": 0,
            "unit": "day",
            "timezone_shift": "+01:00",
        },  # Same day, different timezone (e.g., CET)
    ],
    "field_aliasing": {
        "location": ["loc", "region", "country"],
        "data": ["dataset", "data_type"],
        "license": ["lic", "licence"],
        "retention": ["keep_for", "store_until"],
        "start_date": ["valid_from", "effective_date"],
        "end_date": ["valid_until", "expiry_date"],
        "user.data": ["user_data", "user_info.data"],
        "geo.location": ["location", "geo_info.loc"],
        "policy.license": ["license", "policy_details.lic"],
    },
    "data_type_mismatches": {
        "retention_period": ["30_days", "one_month", "true", "1.0"],
        "consent": ["0", "1", "yes", "no"],
        "is_sensitive": ["0", "1", "false", "true"],
        "access_date": ["yesterday", "tomorrow", "2023-01-01T00:00:00Z"],
    },
}
