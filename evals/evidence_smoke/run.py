import hashlib
import json
import os
import shutil

from libs.evidence.artifacts import save_metrics, save_report, save_stamp
from libs.evidence.eid import compute_eid


def get_file_hash(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()

def run_smoke_test():
    pipeline = "evidence_smoke"
    git_sha = "abcdef0123456789"
    inputs = {"test_input": "value1"}
    params = {"param1": 123}

    eid = compute_eid(pipeline, git_sha, inputs, params)
    eid_str = str(eid)
    print(f"Generated EID: {eid_str}")

    artifact_dir = os.path.join("artifacts", eid_str)
    if os.path.exists(artifact_dir):
        shutil.rmtree(artifact_dir)
    os.makedirs(artifact_dir)

    # Generate data
    report = {
        "eid": eid_str,
        "summary": "This is a smoke test report."
    }
    metrics = {
        "eid": eid_str,
        "metrics": {
            "accuracy": 1.0,
            "latency": 0.5
        }
    }
    stamp = {
        "eid": eid_str,
        "git_sha": git_sha,
        "pipeline": pipeline,
        "inputs_manifest_sha256": eid.inputs12,
        "params_sha256": eid.params8
    }

    # Save artifacts (validation happens here)
    print("Saving artifacts...")
    try:
        save_report(report, artifact_dir)
        save_metrics(metrics, artifact_dir)
        save_stamp(stamp, artifact_dir)
    except Exception as e:
        print(f"Validation failed: {e}")
        exit(1)

    # Verify files exist
    assert os.path.exists(os.path.join(artifact_dir, "report.json"))
    assert os.path.exists(os.path.join(artifact_dir, "metrics.json"))
    assert os.path.exists(os.path.join(artifact_dir, "stamp.json"))

    # Compute hashes
    report_hash = get_file_hash(os.path.join(artifact_dir, "report.json"))
    metrics_hash = get_file_hash(os.path.join(artifact_dir, "metrics.json"))
    stamp_hash = get_file_hash(os.path.join(artifact_dir, "stamp.json"))

    print("First run hashes:")
    print(f"Report: {report_hash}")
    print(f"Metrics: {metrics_hash}")
    print(f"Stamp: {stamp_hash}")

    # Re-run (simulate determinism check)
    shutil.rmtree(artifact_dir)
    os.makedirs(artifact_dir)

    save_report(report, artifact_dir)
    save_metrics(metrics, artifact_dir)
    save_stamp(stamp, artifact_dir)

    report_hash_2 = get_file_hash(os.path.join(artifact_dir, "report.json"))
    metrics_hash_2 = get_file_hash(os.path.join(artifact_dir, "metrics.json"))
    stamp_hash_2 = get_file_hash(os.path.join(artifact_dir, "stamp.json"))

    assert report_hash == report_hash_2, "Report hash mismatch"
    assert metrics_hash == metrics_hash_2, "Metrics hash mismatch"
    assert stamp_hash == stamp_hash_2, "Stamp hash mismatch"

    print("Determinism check passed: Hashes match.")

if __name__ == "__main__":
    run_smoke_test()
