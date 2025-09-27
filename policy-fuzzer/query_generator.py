"""Generates queries for the policy-fuzzer."""

import random
from datetime import datetime, timedelta
from attack_grammars import ATTACK_GRAMMARS
from governance_layers import _resolve_field # Import _resolve_field

DATA_TYPES = ["user_data", "anonymous_data", "marketing_data"]
LOCATIONS = ["US", "EU", "CA", "JP"]
LICENSE_TYPES = ["license_A", "license_B", None]
RETENTION_PERIODS = ["30d", "90d", "1y", None]

def generate_query():
    """Generates a random query, potentially with attack grammars."""
    query = {
        "data": random.choice(DATA_TYPES),
        "location": random.choice(LOCATIONS),
        "license": random.choice(LICENSE_TYPES),
        "retention": random.choice(RETENTION_PERIODS),
        "access_date": datetime.now().isoformat(),
    }

    # Apply synonym dodges to data and license
    if random.random() < 0.5: # 50% chance to apply
        if query["data"] in ATTACK_GRAMMARS["synonym_dodges"]:
            query["data"] = random.choice(ATTACK_GRAMMARS["synonym_dodges"][query["data"]])
        if query["license"] is not None and query["license"] in ATTACK_GRAMMARS["synonym_dodges"]:
            query["license"] = random.choice(ATTACK_GRAMMARS["synonym_dodges"][query["license"]])

    # Apply field aliasing
    if random.random() < 0.5: # 50% chance to apply
        aliased_field = random.choice(list(ATTACK_GRAMMARS["field_aliasing"].keys()))
        alias = random.choice(ATTACK_GRAMMARS["field_aliasing"][aliased_field])
        if aliased_field in query:
            query[alias] = query.pop(aliased_field)

    # Apply regex dodges to retention
    if random.random() < 0.5: # 50% chance to apply
        resolved_retention = _resolve_field(query, "retention")
        if resolved_retention is not None and "retention_period" in ATTACK_GRAMMARS["regex_dodges"]:
            # We need to update the actual key in query, not just the resolved value
            # This is a bit tricky because the key might have been aliased.
            # For simplicity, let's assume if it was aliased, we update the alias.
            # If not aliased, we update 'retention'.
            updated_retention_value = random.choice(ATTACK_GRAMMARS["regex_dodges"]["retention_period"])
            if "retention" in query:
                query["retention"] = updated_retention_value
            else: # It must have been aliased
                for canonical_field, aliases in ATTACK_GRAMMARS["field_aliasing"].items():
                    if canonical_field == "retention":
                        for alias_key in aliases:
                            if alias_key in query:
                                query[alias_key] = updated_retention_value
                                break

    # Apply time-window boundary hops
    if random.random() < 0.5 and ATTACK_GRAMMARS["time_window_boundary_hops"]:
        hop = random.choice(ATTACK_GRAMMARS["time_window_boundary_hops"])
        current_date = datetime.fromisoformat(query["access_date"])
        if hop["unit"] == "day":
            current_date += timedelta(days=hop["offset"])
        elif hop["unit"] == "hour":
            current_date += timedelta(hours=hop["offset"])
        query["access_date"] = current_date.isoformat()

    return query
