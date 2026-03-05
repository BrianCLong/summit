# tools/plan_hash.py
import hashlib
import json

CANON_KEYS = {"operatorType","planner","arguments","details","identifiers"}

def _strip_dynamic(node):
    if not isinstance(node, dict):
        return node
    kept = {k:v for k,v in node.items() if k in CANON_KEYS or isinstance(v,(dict,list))}
    # Remove dynamic stats
    for k in ["rows","dbHits","pageCacheHits","pageCacheMisses","time","rowsIn","rowsOut"]:
        kept.pop(k, None)
    # Deterministic child ordering by (operatorType, json of arguments)
    children = [_strip_dynamic(c) for c in kept.get("children", [])]
    children.sort(key=lambda c: (c.get("operatorType",""), json.dumps(c.get("arguments",{}), sort_keys=True)))
    kept["children"] = children
    # Sort keys deterministically
    return {k: _strip_dynamic(kept[k]) for k in sorted(kept.keys())}

def canonical_json(plan_json):
    canon = _strip_dynamic(plan_json)
    return json.dumps(canon, separators=(",", ":"), sort_keys=True)

def plan_fingerprint(plan_json):
    cj = canonical_json(plan_json)
    return hashlib.sha256(cj.encode("utf-8")).hexdigest()
