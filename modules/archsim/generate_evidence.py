import json
import os
import datetime
from modules.archsim.sim.simulate import simulate
from modules.archsim.audit.auditors import find_spofs, bottleneck_risks

def generate_evidence(spec_path, scenario, evidence_id):
    with open(spec_path, 'r') as f:
        spec = json.load(f)

    sim_result = simulate(spec, scenario)
    metrics = {
        "p95_ms": sim_result.p95_ms,
        "p99_ms": sim_result.p99_ms,
        "error_rate": sim_result.error_rate,
        "cost_usd_per_day": sim_result.cost_usd_per_day,
        "saturation": sim_result.saturation
    }

    findings = find_spofs(spec)
    findings.extend(bottleneck_risks(metrics))

    evidence_dir = f"evidence/{evidence_id}"
    os.makedirs(evidence_dir, exist_ok=True)

    report = {
        "evidence_id": evidence_id,
        "item_slug": "archimyst",
        "summary": f"Architecture simulation and audit for {spec['id']}",
        "findings": findings
    }

    metrics_file = {
        "evidence_id": evidence_id,
        "metrics": metrics
    }

    stamp = {
        "evidence_id": evidence_id,
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    with open(f"{evidence_dir}/report.json", 'w') as f:
        json.dump(report, f, indent=2)
    with open(f"{evidence_dir}/metrics.json", 'w') as f:
        json.dump(metrics_file, f, indent=2)
    with open(f"{evidence_dir}/stamp.json", 'w') as f:
        json.dump(stamp, f, indent=2)

    print(f"Generated evidence in {evidence_dir}")
    return {
        "report": f"evidence/{evidence_id}/report.json",
        "metrics": f"evidence/{evidence_id}/metrics.json",
        "stamp": f"evidence/{evidence_id}/stamp.json"
    }

def update_index(evidence_id, paths):
    index_path = "evidence/index.json"
    if os.path.exists(index_path):
        with open(index_path, 'r') as f:
            index = json.load(f)
    else:
        index = {"evidence": {}, "version": 1}

    index["evidence"][evidence_id] = paths

    with open(index_path, 'w') as f:
        json.dump(index, f, indent=2)
    print(f"Updated {index_path} with {evidence_id}")

if __name__ == "__main__":
    eid = "EVD-ARCHIMYST-SIM-001"
    paths = generate_evidence("fixtures/archsim/valid_minimal.json", {"rps": 100}, eid)
    update_index(eid, paths)
