"""Simulates governance layers for the policy-fuzzer."""

from attack_grammars import ATTACK_GRAMMARS
import re
from datetime import datetime

COVERAGE = {
    "consent": {"user_data": 0, "marketing": 0, "analytics": 0},
    "licenses": {"license_A": 0, "license_B": 0, "default": 0},
    "geo": {"US": 0, "EU": 0, "CA": 0, "ANY": 0},
    "retention": {"30d": 0, "90d": 0, "default": 0},
    "time_window": {"in_window": 0, "out_of_window": 0, "default": 0},
}

def _resolve_field(query, canonical_field_name):
    """Resolves a field name in the query, considering aliases and returning its value."""
    # Check for the canonical field name first
    if canonical_field_name in query:
        return query[canonical_field_name]

    # Check for aliases
    if canonical_field_name in ATTACK_GRAMMARS["field_aliasing"]:
        for alias in ATTACK_GRAMMARS["field_aliasing"][canonical_field_name]:
            if alias in query:
                return query[alias]
    return None

def check_consent(policy, query):
    """Checks consent."""
    policy_consent = policy.get("consent")
    query_data = _resolve_field(query, "data")

    if policy_consent:
        COVERAGE["consent"][policy_consent] += 1

    if policy_consent == "user_data":
        if query_data != "user_data":
            # Check for synonym dodges
            if query_data in ATTACK_GRAMMARS["synonym_dodges"].get("user_data", []):
                return False # Synonym dodge detected
            return False
    return True

def check_licenses(policy, query):
    """Checks licenses."""
    policy_license = policy.get("license")
    query_license = _resolve_field(query, "license")

    if policy_license:
        COVERAGE["licenses"][policy_license] += 1
    else:
        COVERAGE["licenses"]["default"] += 1

    if policy_license == "license_A":
        if query_license != "license_A":
            if query_license in ATTACK_GRAMMARS["synonym_dodges"].get("license_A", []):
                return False
            return False
    return True

def check_geo(policy, query):
    """Checks geo."""
    policy_geo = policy.get("geo")
    query_location = _resolve_field(query, "location")

    if policy_geo:
        COVERAGE["geo"][policy_geo] += 1

    if policy_geo == "US":
        if query_location != "US":
            # Check for regex dodges
            for regex in ATTACK_GRAMMARS["regex_dodges"].get("geo", []):
                if re.match(regex, query_location):
                    return False # Regex dodge detected
            return False
    elif policy_geo == "EU":
        if query_location != "EU":
            # Check for regex dodges
            for regex in ATTACK_GRAMMARS["regex_dodges"].get("geo", []):
                if re.match(regex, query_location):
                    return False # Regex dodge detected
            return False
    return True

def check_retention(policy, query):
    """Checks retention."""
    policy_retention = policy.get("retention")
    query_retention = _resolve_field(query, "retention")

    if policy_retention:
        COVERAGE["retention"][policy_retention] += 1
    else:
        COVERAGE["retention"]["default"] += 1

    if policy_retention == "30d":
        if query_retention is not None and query_retention != "30d":
            for regex in ATTACK_GRAMMARS["regex_dodges"].get("retention_period", []):
                if re.match(regex, query_retention):
                    return False
            return False
    return True

def check_time_window(policy, query):
    """Checks if the query access_date is within the policy's start_date and end_date."""
    policy_start_date_str = policy.get("start_date")
    policy_end_date_str = policy.get("end_date")
    query_access_date_str = _resolve_field(query, "access_date")

    if not all([policy_start_date_str, policy_end_date_str, query_access_date_str]):
        COVERAGE["time_window"]["default"] += 1
        return True # No time window specified, so compliant

    policy_start_date = datetime.fromisoformat(policy_start_date_str)
    policy_end_date = datetime.fromisoformat(policy_end_date_str)
    query_access_date = datetime.fromisoformat(query_access_date_str)

    if policy_start_date <= query_access_date <= policy_end_date:
        COVERAGE["time_window"]["in_window"] += 1
        return True
    else:
        COVERAGE["time_window"]["out_of_window"] += 1
        return False
