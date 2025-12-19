"""Simulates governance layers for the policy-fuzzer."""

import re
from datetime import datetime

from attack_grammars import ATTACK_GRAMMARS

COVERAGE = {
    "consent": {
        "policy_user_data_match": 0,
        "policy_user_data_synonym_dodge": 0,
        "policy_user_data_mismatch": 0,
        "policy_marketing": 0,
        "policy_analytics": 0,
        "default": 0,
    },
    "licenses": {
        "policy_license_A_match": 0,
        "policy_license_A_synonym_dodge": 0,
        "policy_license_A_mismatch": 0,
        "policy_license_B": 0,
        "default": 0,
    },
    "geo": {
        "policy_US_match": 0,
        "policy_US_regex_dodge": 0,
        "policy_US_mismatch": 0,
        "policy_EU_match": 0,
        "policy_EU_regex_dodge": 0,
        "policy_EU_mismatch": 0,
        "policy_CA": 0,
        "policy_ANY": 0,
        "default": 0,
    },
    "retention": {
        "policy_30d_match": 0,
        "policy_30d_regex_dodge": 0,
        "policy_30d_mismatch": 0,
        "policy_90d": 0,
        "policy_1y": 0,
        "default": 0,
    },
    "time_window": {
        "in_window": 0,
        "out_of_window": 0,
        "day_offset": 0,
        "hour_offset": 0,
        "week_offset": 0,
        "month_offset": 0,
        "timezone_shift": 0,
        "default": 0,
    },
    "data_type_mismatches": {
        "retention_period_mismatch": 0,
        "consent_mismatch": 0,
        "is_sensitive_mismatch": 0,
        "access_date_mismatch": 0,
        "none": 0,
    },
    "field_aliasing": {
        "location_aliased": 0,
        "data_aliased": 0,
        "license_aliased": 0,
        "retention_aliased": 0,
        "start_date_aliased": 0,
        "end_date_aliased": 0,
        "nested_aliased": 0,
        "none": 0,
    },
    "user_role": {"admin_match": 0, "analyst_match": 0, "guest_match": 0, "default": 0},
    "network_condition": {"secure_match": 0, "unsecure_match": 0, "vpn_match": 0, "default": 0},
}


def _resolve_field(query, canonical_field_name):
    """Resolves a field name in the query, considering aliases and returning its value."""

    # Helper to get nested value from a dict using a dot-separated path
    def get_nested_value(data, path):
        parts = path.split(".")
        for part in parts:
            if isinstance(data, dict) and part in data:
                data = data[part]
            else:
                return None
        return data

    # Check for the canonical field name first, including nested access
    resolved_value = get_nested_value(query, canonical_field_name)
    if resolved_value is not None:
        # Check if it was a nested canonical field
        if "." in canonical_field_name:
            COVERAGE["field_aliasing"]["nested_aliased"] += 1
        else:
            COVERAGE["field_aliasing"]["none"] += 1  # Direct match, no aliasing
        return resolved_value

    # Check for aliases, including nested access
    if canonical_field_name in ATTACK_GRAMMARS["field_aliasing"]:
        for alias in ATTACK_GRAMMARS["field_aliasing"][canonical_field_name]:
            resolved_value = get_nested_value(query, alias)
            if resolved_value is not None:
                if "." in alias:
                    COVERAGE["field_aliasing"]["nested_aliased"] += 1
                else:
                    # Track specific top-level aliases
                    if canonical_field_name == "location":
                        COVERAGE["field_aliasing"]["location_aliased"] += 1
                    elif canonical_field_name == "data":
                        COVERAGE["field_aliasing"]["data_aliased"] += 1
                    elif canonical_field_name == "license":
                        COVERAGE["field_aliasing"]["license_aliased"] += 1
                    elif canonical_field_name == "retention":
                        COVERAGE["field_aliasing"]["retention_aliased"] += 1
                    elif canonical_field_name == "start_date":
                        COVERAGE["field_aliasing"]["start_date_aliased"] += 1
                    elif canonical_field_name == "end_date":
                        COVERAGE["field_aliasing"]["end_date_aliased"] += 1
                return resolved_value
    COVERAGE["field_aliasing"]["none"] += 1  # No alias found
    return None


def check_consent(policy, query):
    """Checks consent."""
    policy_consent = policy.get("consent")
    query_data = _resolve_field(query, "data")

    if policy_consent == "user_data":
        if query_data == "user_data":
            COVERAGE["consent"]["policy_user_data_match"] += 1
            return True, None
        elif query_data in ATTACK_GRAMMARS["synonym_dodges"].get("user_data", []):
            COVERAGE["consent"]["policy_user_data_synonym_dodge"] += 1
            return (
                False,
                f"Consent policy requires 'user_data', but query used synonym dodge: {query_data}",
            )  # Synonym dodge detected
        else:
            COVERAGE["consent"]["policy_user_data_mismatch"] += 1
            return False, f"Consent policy requires 'user_data', but query provided: {query_data}"
    elif policy_consent == "marketing":
        COVERAGE["consent"]["policy_marketing"] += 1
        return True, None  # Assuming marketing data is generally allowed if policy specifies it
    elif policy_consent == "analytics":
        COVERAGE["consent"]["policy_analytics"] += 1
        return True, None  # Assuming analytics data is generally allowed if policy specifies it
    else:
        COVERAGE["consent"]["default"] += 1
        return True, None


def check_licenses(policy, query):
    """Checks licenses."""
    policy_license = policy.get("license")
    query_license = _resolve_field(query, "license")

    if policy_license == "license_A":
        if query_license == "license_A":
            COVERAGE["licenses"]["policy_license_A_match"] += 1
            return True, None
        elif query_license in ATTACK_GRAMMARS["synonym_dodges"].get("license_A", []):
            COVERAGE["licenses"]["policy_license_A_synonym_dodge"] += 1
            return (
                False,
                f"License policy requires 'license_A', but query used synonym dodge: {query_license}",
            )
        else:
            COVERAGE["licenses"]["policy_license_A_mismatch"] += 1
            return (
                False,
                f"License policy requires 'license_A', but query provided: {query_license}",
            )
    elif policy_license == "license_B":
        COVERAGE["licenses"]["policy_license_B"] += 1
        return True, None
    else:
        COVERAGE["licenses"]["default"] += 1
        return True, None


def check_geo(policy, query):
    """Checks geo."""
    policy_geo = policy.get("geo")
    query_location = _resolve_field(query, "location")

    if policy_geo == "US":
        if query_location == "US":
            COVERAGE["geo"]["policy_US_match"] += 1
            return True, None
        else:
            for regex in ATTACK_GRAMMARS["regex_dodges"].get("geo", []):
                if re.match(regex, query_location):
                    COVERAGE["geo"]["policy_US_regex_dodge"] += 1
                    return (
                        False,
                        f"Geo policy requires 'US', but query used regex dodge: {query_location}",
                    )
            COVERAGE["geo"]["policy_US_mismatch"] += 1
            return False, f"Geo policy requires 'US', but query provided: {query_location}"
    elif policy_geo == "EU":
        if query_location == "EU":
            COVERAGE["geo"]["policy_EU_match"] += 1
            return True, None
        else:
            for regex in ATTACK_GRAMMARS["regex_dodges"].get("geo", []):
                if re.match(regex, query_location):
                    COVERAGE["geo"]["policy_EU_regex_dodge"] += 1
                    return (
                        False,
                        f"Geo policy requires 'EU', but query used regex dodge: {query_location}",
                    )
            COVERAGE["geo"]["policy_EU_mismatch"] += 1
            return False, f"Geo policy requires 'EU', but query provided: {query_location}"
    elif policy_geo == "CA":
        COVERAGE["geo"]["policy_CA"] += 1
        return True, None
    elif policy_geo == "ANY":
        COVERAGE["geo"]["policy_ANY"] += 1
        return True, None
    else:
        COVERAGE["geo"]["default"] += 1
        return True, None


def check_retention(policy, query):
    """Checks retention."""
    policy_retention = policy.get("retention")
    query_retention = _resolve_field(query, "retention")

    if policy_retention == "30d":
        if query_retention == "30d":
            COVERAGE["retention"]["policy_30d_match"] += 1
            return True, None
        else:
            # Check for regex dodges
            for regex in ATTACK_GRAMMARS["regex_dodges"].get("retention_period", []):
                if isinstance(query_retention, str) and re.match(regex, query_retention):
                    COVERAGE["retention"]["policy_30d_regex_dodge"] += 1
                    return (
                        False,
                        f"Retention policy requires '30d', but query used regex dodge: {query_retention}",
                    )
            # Check for data type mismatches
            if str(query_retention) in ATTACK_GRAMMARS["data_type_mismatches"].get(
                "retention_period", []
            ):
                COVERAGE["data_type_mismatches"]["retention_period_mismatch"] += 1
                return (
                    False,
                    f"Retention policy requires '30d', but query provided mismatched data type: {query_retention}",
                )
            COVERAGE["retention"]["policy_30d_mismatch"] += 1
            return False, f"Retention policy requires '30d', but query provided: {query_retention}"
    elif policy_retention == "90d":
        COVERAGE["retention"]["policy_90d"] += 1
        return True, None
    elif policy_retention == "1y":
        COVERAGE["retention"]["policy_1y"] += 1
        return True, None
    else:
        COVERAGE["retention"]["default"] += 1
        return True, None


def _apply_timezone_shift_to_datetime(dt, timezone_shift_str):
    if timezone_shift_str:
        sign = timezone_shift_str[0]
        hours = int(timezone_shift_str[1:3])
        minutes = int(timezone_shift_str[4:6])
        offset = timedelta(hours=hours, minutes=minutes)
        if sign == "-":
            return dt + offset
        else:
            return dt - offset
    return dt


def check_time_window(policy, query):
    """Checks if the query access_date is within the policy's start_date and end_date."""
    policy_start_date_str = policy.get("start_date")
    policy_end_date_str = policy.get("end_date")
    query_access_date_raw = _resolve_field(query, "access_date")

    if not all([policy_start_date_str, policy_end_date_str, query_access_date_raw]):
        COVERAGE["time_window"]["default"] += 1
        return True, None  # No time window specified, so compliant

    # Check for data type mismatch for access_date
    if str(query_access_date_raw) in ATTACK_GRAMMARS["data_type_mismatches"].get("access_date", []):
        COVERAGE["data_type_mismatches"]["access_date_mismatch"] += 1
        return (
            False,
            f"Time window policy expects a valid date, but query provided mismatched data type: {query_access_date_raw}",
        )

    try:
        policy_start_date = datetime.fromisoformat(policy_start_date_str)
        policy_end_date = datetime.fromisoformat(policy_end_date_str)
        query_access_date = datetime.fromisoformat(query_access_date_raw)
    except ValueError:
        COVERAGE["data_type_mismatches"]["access_date_mismatch"] += 1
        return (
            False,
            f"Time window policy expects a valid date, but query provided invalid date format: {query_access_date_raw}",
        )

    # Apply timezone shift if present in the query
    query_access_date_shifted = _apply_timezone_shift_to_datetime(
        query_access_date, query.get("timezone_shift")
    )
    if query.get("timezone_shift"):
        COVERAGE["time_window"]["timezone_shift"] += 1

    if policy_start_date <= query_access_date_shifted <= policy_end_date:
        COVERAGE["time_window"]["in_window"] += 1
        return True, None
    else:
        COVERAGE["time_window"]["out_of_window"] += 1
        return (
            False,
            f"Access date {query_access_date_shifted.isoformat()} is outside policy window {policy_start_date.isoformat()} - {policy_end_date.isoformat()}",
        )

def check_user_role(policy, query):
    """Checks user role."""
    policy_role = policy.get("user_role")
    query_role = _resolve_field(query, "user_role")

    if not policy_role:
        COVERAGE["user_role"]["default"] += 1
        return True, None

    if policy_role == "admin":
        if query_role == "admin":
            COVERAGE["user_role"]["admin_match"] += 1
            return True, None
        else:
            return False, f"Policy requires admin, got {query_role}"
    elif policy_role == "analyst":
        if query_role in ["admin", "analyst"]:
            COVERAGE["user_role"]["analyst_match"] += 1
            return True, None
        else:
            return False, f"Policy requires analyst+, got {query_role}"
    elif policy_role == "guest":
        COVERAGE["user_role"]["guest_match"] += 1
        return True, None

    COVERAGE["user_role"]["default"] += 1
    return True, None

def check_network_condition(policy, query):
    """Checks network condition."""
    policy_net = policy.get("network_condition")
    query_net = _resolve_field(query, "network_condition")

    if not policy_net:
        COVERAGE["network_condition"]["default"] += 1
        return True, None

    if policy_net == "secure":
        if query_net == "secure":
            COVERAGE["network_condition"]["secure_match"] += 1
            return True, None
        else:
            return False, f"Policy requires secure network, got {query_net}"
    elif policy_net == "unsecure":
        COVERAGE["network_condition"]["unsecure_match"] += 1
        return True, None
    elif policy_net == "vpn":
        if query_net in ["secure", "vpn"]:
             COVERAGE["network_condition"]["vpn_match"] += 1
             return True, None
        else:
            return False, f"Policy requires VPN/secure, got {query_net}"

    COVERAGE["network_condition"]["default"] += 1
    return True, None
