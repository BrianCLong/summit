import argparse
import sys
import os
import json
from .sketch import LogBinSketch
from .drift import DriftDetector
from .evidence import EvidenceGenerator
from .io import build_sketch_from_file
from .html_report import generate_html_report

def cmd_baseline_build(args):
    print(f"Building baseline from {args.input}...")
    sketch = build_sketch_from_file(args.input)

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(sketch.to_dict(), f)
    print(f"Baseline saved to {args.output}")

def cmd_window_run(args):
    print(f"Running validation on {args.input} against {args.baseline}...")

    # Load baseline
    with open(args.baseline, "r") as f:
        baseline_data = json.load(f)
    baseline_sketch = LogBinSketch.from_dict(baseline_data)

    # Build window sketch
    window_sketch = build_sketch_from_file(args.input)

    # Detect drift
    detector = DriftDetector(threshold_d=args.threshold_d, threshold_p=args.threshold_p)
    result = detector.check(baseline_sketch, window_sketch)

    print(f"Result: {result.status} (D={result.d:.4f}, p={result.p_value:.4e})")

    # Generate Evidence
    evidence_gen = EvidenceGenerator(
        run_id=args.run_id,
        git_sha=os.environ.get("GITHUB_SHA", "unknown"),
        config={"threshold_d": args.threshold_d, "threshold_p": args.threshold_p}
    )

    report = {
        "run_id": args.run_id,
        "drift_result": result.to_dict(),
        "metadata": {
            "baseline_n": baseline_sketch.n,
            "window_n": window_sketch.n,
            "baseline_file": args.baseline,
            "window_file": args.input
        }
    }

    metrics = {
        "ks_distance": result.d,
        "ks_p_value": result.p_value,
        "status": 1 if result.status == "OK" else 0,
        "baseline_count": baseline_sketch.n,
        "window_count": window_sketch.n
    }

    evidence_gen.save_artifacts(args.out_dir, report, metrics)

    # Save HTML
    html = generate_html_report(report)
    with open(os.path.join(args.out_dir, "report.html"), "w") as f:
        f.write(html)

    if result.status == "DRIFT":
        sys.exit(2)
    sys.exit(0)

def main():
    parser = argparse.ArgumentParser(description="Graph Degree Distribution Validator")
    subparsers = parser.add_subparsers(dest="noun", required=True)

    # Baseline Build
    p_baseline = subparsers.add_parser("baseline")
    p_baseline_subs = p_baseline.add_subparsers(dest="verb", required=True)
    p_build = p_baseline_subs.add_parser("build")
    p_build.add_argument("--input", required=True, help="Input JSONL degrees file")
    p_build.add_argument("--output", required=True, help="Output JSON sketch file")
    p_build.set_defaults(func=cmd_baseline_build)

    # Window Run
    p_window = subparsers.add_parser("window")
    p_window_subs = p_window.add_subparsers(dest="verb", required=True)
    p_run = p_window_subs.add_parser("run")
    p_run.add_argument("--input", required=True, help="Input JSONL degrees file")
    p_run.add_argument("--baseline", required=True, help="Baseline JSON sketch file")
    p_run.add_argument("--out-dir", required=True, help="Output directory for evidence")
    p_run.add_argument("--threshold-d", type=float, default=0.05, help="KS Distance threshold")
    p_run.add_argument("--threshold-p", type=float, default=0.01, help="P-value threshold")
    p_run.add_argument("--run-id", default="test-run", help="Run ID for evidence")
    p_run.set_defaults(func=cmd_window_run)

    args = parser.parse_args()
    if hasattr(args, 'func'):
        args.func(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
