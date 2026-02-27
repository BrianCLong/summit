import json, os, hashlib
from pathlib import Path

OUT_DIR = Path("artifacts/plan")
REPORT = OUT_DIR / "plan-report.json"
HEATMAP = Path("plan-heatmap.html")

def sha256_file(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    commit = os.getenv("GITHUB_SHA", "UNKNOWN")
    repo = os.getenv("GITHUB_REPOSITORY", "UNKNOWN")
    run_id = os.getenv("GITHUB_RUN_ID", "UNKNOWN")  # runtime metadata, not deterministic

    subject = []
    if REPORT.exists():
        subject.append({"name": str(REPORT), "digest": {"sha256": sha256_file(REPORT)}})
    if HEATMAP.exists():
        subject.append({"name": str(HEATMAP), "digest": {"sha256": sha256_file(HEATMAP)}})

    stmt = {
        "_type": "https://in-toto.io/Statement/v1",
        "subject": subject,
        "predicateType": "https://summit.topicality.ai/plan-stability/v1",
        "predicate": {
            "repo": repo,
            "commit": commit,
            "ci": {"run_id": run_id},
            "artifacts": {
                "plan_report": str(REPORT) if REPORT.exists() else None,
                "heatmap": str(HEATMAP) if HEATMAP.exists() else None
            }
        }
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "plan-attestation.intoto.jsonl"
    out.write_text(json.dumps(stmt, separators=(",", ":"), sort_keys=True) + "\n", encoding="utf-8")
    print(f"Wrote {out}")

if __name__ == "__main__":
    main()
