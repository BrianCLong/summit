# services/synthesizer/consensus.py
from collections import defaultdict


def consensus(results, trust: dict[str, float] | None = None):
    trust = trust or {}
    # aggregate by key; weight = claim.conf * source_trust
    agg = defaultdict(lambda: defaultdict(float))
    evidence = defaultdict(list)
    for r in results:
        for c in r.get("claims", []):
            w = float(c.get("conf", 0.5)) * float(trust.get(c.get("sourceUrl", ""), 1.0))
            agg[c["key"]][c["value"]] += w
            evidence[(c["key"], c["value"])].append(c.get("sourceUrl"))
    merged = {}
    conflicts = []
    for k, dist in agg.items():
        top = max(dist.items(), key=lambda kv: kv[1])
        merged[k] = {"value": top[0], "score": top[1], "evidence": list(set(evidence[(k, top[0])]))}
        if len(dist) > 1:
            conflicts.append(
                {"key": k, "alts": sorted([(v, s) for v, s in dist.items()], key=lambda x: -x[1])}
            )
    # global consensus score: normalized average of top mass across keys
    denom = sum(sum(d.values()) for d in agg.values()) or 1.0
    top_mass = sum(v["score"] for v in merged.values())
    return merged, conflicts, top_mass / denom
