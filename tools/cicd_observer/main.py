import argparse
import json
import os
import sys

from fetch import fetch_runs
from ingest import ingest_from_file, ingest_directory
from compute import compute_metrics
from render import render_markdown, render_report_json
from stamp import generate_stamp

def main():
    parser = argparse.ArgumentParser(description="CI/CD Observer")
    parser.add_argument("--mode", choices=["online", "offline"], default="offline")
    parser.add_argument("--owner", help="GitHub Owner (online mode)")
    parser.add_argument("--repo", help="GitHub Repo (online mode)")
    parser.add_argument("--fixture", help="Fixture file or directory (offline mode)")
    parser.add_argument("--output-dir", default="evidence/latest", help="Output directory for reports")

    args = parser.parse_args()

    runs = []
    inputs_meta = {}

    if args.mode == "online":
        if not args.owner or not args.repo:
            print("Error: --owner and --repo required for online mode")
            sys.exit(1)
        token = os.environ.get("GITHUB_TOKEN")
        runs = fetch_runs(args.owner, args.repo, token)
        inputs_meta = {"mode": "online", "owner": args.owner, "repo": args.repo}
    else:
        if not args.fixture:
            print("Error: --fixture required for offline mode")
            sys.exit(1)
        if os.path.isdir(args.fixture):
            runs = ingest_directory(args.fixture)
        else:
            runs = ingest_from_file(args.fixture)
        inputs_meta = {"mode": "offline", "fixture": args.fixture}

    metrics = compute_metrics(runs)
    report_json = render_report_json(metrics)
    report_md = render_markdown(metrics)

    stamp = generate_stamp(inputs_meta, metrics)

    os.makedirs(args.output_dir, exist_ok=True)

    with open(os.path.join(args.output_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    with open(os.path.join(args.output_dir, "report.json"), "w") as f:
        json.dump(report_json, f, indent=2)

    with open(os.path.join(args.output_dir, "report.md"), "w") as f:
        f.write(report_md)

    with open(os.path.join(args.output_dir, "stamp.json"), "w") as f:
        json.dump(stamp, f, indent=2)

    print(f"Report generated in {args.output_dir}")

if __name__ == "__main__":
    main()
