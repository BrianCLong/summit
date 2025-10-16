"""Generates queries for the policy-fuzzer."""

import random
from datetime import datetime, timedelta

from attack_grammars import ATTACK_GRAMMARS
from governance_layers import _resolve_field  # Import _resolve_field

DATA_TYPES = ["user_data", "anonymous_data", "marketing_data"]
LOCATIONS = ["US", "EU", "CA", "JP"]
LICENSE_TYPES = ["license_A", "license_B", None]
RETENTION_PERIODS = ["30d", "90d", "1y", None]
USER_ROLES = ["admin", "analyst", "guest"]
NETWORK_CONDITIONS = ["secure", "unsecure", "vpn"]


def generate_query(args):
    """Generates a random query, potentially with attack grammars."""
    query = {
        "data": random.choice(DATA_TYPES),
        "location": random.choice(LOCATIONS),
        "license": random.choice(LICENSE_TYPES),
        "retention": random.choice(RETENTION_PERIODS),
        "access_date": datetime.now().isoformat(),
        "user_role": random.choice(USER_ROLES),
        "network_condition": random.choice(NETWORK_CONDITIONS),
    }

    # Apply synonym dodges to data and license
    if args.enable_synonym_dodges and random.random() < 0.5:  # 50% chance to apply
        if query["data"] in ATTACK_GRAMMARS["synonym_dodges"]:
            query["data"] = random.choice(ATTACK_GRAMMARS["synonym_dodges"][query["data"]])
        if query["license"] is not None and query["license"] in ATTACK_GRAMMARS["synonym_dodges"]:
            query["license"] = random.choice(ATTACK_GRAMMARS["synonym_dodges"][query["license"]])

    # Apply field aliasing
    if args.enable_field_aliasing and random.random() < 0.5:  # 50% chance to apply
        aliased_canonical_field = random.choice(list(ATTACK_GRAMMARS["field_aliasing"].keys()))
        alias = random.choice(ATTACK_GRAMMARS["field_aliasing"][aliased_canonical_field])

        # Get the value of the canonical field before potentially popping it
        value_to_alias = query.get(aliased_canonical_field)
        if value_to_alias is None:  # Check if it's a nested canonical field
            value_to_alias = _resolve_field(query, aliased_canonical_field)

        if value_to_alias is not None:
            # Remove the original canonical field if it was top-level
            if aliased_canonical_field in query:
                query.pop(aliased_canonical_field)
            else:  # If it was nested, we need to remove the nested path
                parts = aliased_canonical_field.split(".")
                temp_dict = query
                for i, part in enumerate(parts):
                    if i == len(parts) - 1:
                        if part in temp_dict:
                            temp_dict.pop(part)
                    elif part in temp_dict:
                        temp_dict = temp_dict[part]
                    else:
                        break

            # Set the aliased field, creating nested dictionaries if necessary
            parts = alias.split(".")
            temp_dict = query
            for i, part in enumerate(parts):
                if i == len(parts) - 1:
                    temp_dict[part] = value_to_alias
                else:
                    if part not in temp_dict or not isinstance(temp_dict[part], dict):
                        temp_dict[part] = {}
                    temp_dict = temp_dict[part]

    # Apply regex dodges to retention
    if args.enable_regex_dodges and random.random() < 0.5:  # 50% chance to apply
        resolved_retention = _resolve_field(query, "retention")
        if resolved_retention is not None and "retention_period" in ATTACK_GRAMMARS["regex_dodges"]:
            # We need to update the actual key in query, not just the resolved value
            # This is a bit tricky because the key might have been aliased.
            # For simplicity, let's assume if it was aliased, we update the alias.
            # If not aliased, we update 'retention'.
            updated_retention_value = random.choice(
                ATTACK_GRAMMARS["regex_dodges"]["retention_period"]
            )
            if "retention" in query:
                query["retention"] = updated_retention_value
            else:  # It must have been aliased
                for canonical_field, aliases in ATTACK_GRAMMARS["field_aliasing"].items():
                    if canonical_field == "retention":
                        for alias_key in aliases:
                            if alias_key in query:
                                query[alias_key] = updated_retention_value
                                break

    # Apply time-window boundary hops
    if (
        args.enable_time_window_hops
        and random.random() < 0.5
        and ATTACK_GRAMMARS["time_window_boundary_hops"]
    ):
        hop = random.choice(ATTACK_GRAMMARS["time_window_boundary_hops"])
        current_date = datetime.fromisoformat(query["access_date"])
        if hop["unit"] == "day":
            current_date += timedelta(days=hop["offset"])
        elif hop["unit"] == "hour":
            current_date += timedelta(hours=hop["offset"])
        elif hop["unit"] == "week":
            current_date += timedelta(weeks=hop["offset"])
        elif hop["unit"] == "month":
            current_date += timedelta(days=hop["offset"] * 30)  # Approximate month
        query["access_date"] = current_date.isoformat()
        if "timezone_shift" in hop:
            query["timezone_shift"] = hop["timezone_shift"]

    # Apply data type mismatches
    if (
        args.enable_data_type_mismatches
        and random.random() < 0.5
        and ATTACK_GRAMMARS["data_type_mismatches"]
    ):
        field_to_mismatch = random.choice(list(ATTACK_GRAMMARS["data_type_mismatches"].keys()))
        if field_to_mismatch in query:
            query[field_to_mismatch] = random.choice(
                ATTACK_GRAMMARS["data_type_mismatches"][field_to_mismatch]
            )

    return query
