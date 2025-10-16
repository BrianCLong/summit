# Minimal reproducer.
policy = {
    "consent": "analytics",
    "geo": "ANY",
    "license": "license_A",
    "retention": None,
    "start_date": "2025-09-13T20:20:56.508501",
    "end_date": "2026-08-17T20:20:56.508501",
}
query = {
    "data": "marketing_data",
    "location": "EU",
    "license": "licenseA",
    "retention": "[0-9]+d",
    "access_date": "2025-09-25T20:20:56.508505",
}
