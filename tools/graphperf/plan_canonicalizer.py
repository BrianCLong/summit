import json
import hashlib

def canonicalize_plan(profile):
    """
    Converts a Neo4j profile tree into a stable dictionary for hashing.
    Focuses on operator structure and relationship between operators.
    Execution-specific metrics like 'time' are excluded.
    """
    if not profile:
        return None

    # We recursively capture the operator types
    children = [canonicalize_plan(c) for c in profile.children]

    return {
        "op": profile.operator_type,
        "children": children
    }

def get_plan_hash(profile):
    """
    Produces a stable SHA256 hash for a Neo4j query plan.
    """
    if not profile:
        return "none"

    canonical = canonicalize_plan(profile)
    plan_str = json.dumps(canonical, sort_keys=True)
    return hashlib.sha256(plan_str.encode()).hexdigest()

def get_db_hits(profile):
    """
    Aggregates total dbHits from a profile tree.
    """
    if not profile:
        return 0

    hits = profile.db_hits
    for child in profile.children:
        hits += get_db_hits(child)
    return hits
