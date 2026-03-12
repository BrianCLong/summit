import json
import argparse
import sys
import os

def load_json(filepath):
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find file {filepath}")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Could not parse JSON in {filepath}")
        sys.exit(1)

def compare_metrics(baseline, current, metric_path):
    """Safely extract and compare nested metrics."""
    def get_nested(data, path):
        keys = path.split('.')
        val = data
        for k in keys:
            if isinstance(val, dict) and k in val:
                val = val[k]
            else:
                return None
        return val

    base_val = get_nested(baseline, metric_path)
    curr_val = get_nested(current, metric_path)

    if base_val is None or curr_val is None:
        return None, None, None

    # Calculate percentage change
    if base_val == 0:
        if curr_val == 0:
            pct_change = 0.0
        else:
            pct_change = float('inf') if curr_val > 0 else float('-inf')
    else:
        pct_change = ((curr_val - base_val) / base_val) * 100

    return base_val, curr_val, pct_change

def print_comparison_table(results):
    print(f"{'Scale':<10} | {'Metric':<30} | {'Baseline':<12} | {'Current':<12} | {'Diff %':<10} | {'Status':<6}")
    print("-" * 90)

    for result in results:
        scale, metric_name, base_val, curr_val, pct_change, status = result

        # Format the values depending on whether they are integers or floats
        base_str = f"{base_val:.4f}" if isinstance(base_val, float) else str(base_val)
        curr_str = f"{curr_val:.4f}" if isinstance(curr_val, float) else str(curr_val)

        if pct_change is None:
             pct_str = "N/A"
        elif pct_change == float('inf'):
             pct_str = "+inf%"
        elif pct_change == float('-inf'):
             pct_str = "-inf%"
        else:
             pct_str = f"{pct_change:+.2f}%"

        print(f"{scale:<10} | {metric_name:<30} | {base_str:<12} | {curr_str:<12} | {pct_str:<10} | {status:<6}")

def analyze_benchmarks(baseline_file, current_file, fail_threshold_pct=10.0):
    baseline_data = load_json(baseline_file)
    current_data = load_json(current_file)

    base_results = baseline_data.get("results", {})
    curr_results = current_data.get("results", {})

    scales = sorted(list(set(base_results.keys()) | set(curr_results.keys())))

    comparison_results = []
    has_failures = False

    for scale in scales:
        if scale not in base_results:
            print(f"Warning: Scale {scale} not in baseline.")
            continue
        if scale not in curr_results:
            print(f"Warning: Scale {scale} not in current results.")
            continue

        base_scale_data = base_results[scale]
        curr_scale_data = curr_results[scale]

        metrics_to_compare = [
            ("Ingestion Throughput (docs/s)", "ingestion.throughput_docs_per_sec", True), # Higher is better
            ("Query Throughput (q/s)", "query.throughput_queries_per_sec", True),
            ("Query Latency p50 (s)", "query.latency_sec.p50", False), # Lower is better
            ("Query Latency p95 (s)", "query.latency_sec.p95", False),
            ("Query Latency p99 (s)", "query.latency_sec.p99", False),
            ("Query Latency mean (s)", "query.latency_sec.mean", False),
            ("Peak Memory (MB)", "memory_peak_mb", False)
        ]

        for metric_name, path, higher_is_better in metrics_to_compare:
            base_val, curr_val, pct_change = compare_metrics(base_scale_data, curr_scale_data, path)

            if pct_change is None:
                continue

            # Determine status
            status = "✅"
            if higher_is_better:
                # If throughput drops significantly
                if pct_change < -fail_threshold_pct:
                    status = "❌"
                    has_failures = True
                elif pct_change < 0:
                     status = "⚠️"
            else:
                # If latency or memory increases significantly
                if pct_change > fail_threshold_pct:
                    status = "❌"
                    has_failures = True
                elif pct_change > 0:
                     status = "⚠️"

            comparison_results.append((scale, metric_name, base_val, curr_val, pct_change, status))

    print_comparison_table(comparison_results)

    if has_failures:
        print(f"\n❌ Benchmark failed! Performance degradation exceeded {fail_threshold_pct}%.")
        return False
    else:
        print(f"\n✅ Benchmark passed. No significant performance degradation detected.")
        return True

def main():
    parser = argparse.ArgumentParser(description="Compare performance benchmark results.")
    parser.add_argument("--baseline", required=True, help="Path to baseline JSON file")
    parser.add_argument("--current", required=True, help="Path to current results JSON file")
    parser.add_argument("--threshold", type=float, default=10.0, help="Failure threshold percentage (default 10.0)")

    args = parser.parse_args()

    success = analyze_benchmarks(args.baseline, args.current, args.threshold)

    if not success:
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
