from __future__ import annotations
from typing import Dict, Any, List

def find_spofs(spec: Dict[str, Any]) -> List[Dict[str, Any]]:
    # SPOF heuristic: any db/cache/queue with replicas==1 is a finding.
    out: List[Dict[str, Any]] = []
    for c in spec["components"]:
        if c["type"] in ("db", "cache", "queue") and int(c.get("replicas", 1)) == 1:
            out.append({
                "kind": "spof",
                "component": c["name"],
                "reason": "critical component has replicas=1"
            })
    return out

def bottleneck_risks(sim_metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if sim_metrics.get("saturation", 0.0) >= 0.85:
        out.append({
            "kind": "bottleneck",
            "reason": "saturation>=0.85",
            "value": sim_metrics["saturation"]
        })
    if sim_metrics.get("p99_ms", 0.0) >= 500.0:
        out.append({
            "kind": "latency",
            "reason": "p99_ms>=500",
            "value": sim_metrics["p99_ms"]
        })
    if sim_metrics.get("error_rate", 0.0) >= 0.01:
        out.append({
            "kind": "errors",
            "reason": "error_rate>=1%",
            "value": sim_metrics["error_rate"]
        })
    return out
