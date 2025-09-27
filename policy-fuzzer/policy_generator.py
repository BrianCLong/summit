"""Generates policies for the policy-fuzzer."""

import random
from datetime import datetime, timedelta

CONSENT_TYPES = ["user_data", "marketing", "analytics"]
GEO_LOCATIONS = ["US", "EU", "CA", "ANY"]
LICENSE_TYPES = ["license_A", "license_B", None]
RETENTION_PERIODS = ["30d", "90d", None]

def generate_policy():
    """Generates a random policy."""
    start_date = datetime.now() - timedelta(days=random.randint(0, 365))
    end_date = start_date + timedelta(days=random.randint(1, 365))

    policy = {
        "consent": random.choice(CONSENT_TYPES),
        "geo": random.choice(GEO_LOCATIONS),
        "license": random.choice(LICENSE_TYPES),
        "retention": random.choice(RETENTION_PERIODS),
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
    }
    return policy
