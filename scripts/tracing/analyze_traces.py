import json
import sys
from collections import defaultdict

def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze_traces.py <traces.json>")
        sys.exit(1)

    trace_file = sys.argv[1]

    # name -> list of durations (in ms)
    span_durations = defaultdict(list)
    span_counts = defaultdict(int)

    try:
        with open(trace_file, 'r') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    span = json.loads(line)
                    name = span.get("name")
                    start = span.get("start_time")
                    end = span.get("end_time")

                    if name and start and end:
                        # Convert from nanoseconds to milliseconds
                        duration_ms = (end - start) / 1e6
                        span_durations[name].append(duration_ms)
                        span_counts[name] += 1
                except json.JSONDecodeError:
                    print(f"Failed to parse line: {line}")
                    continue
    except FileNotFoundError:
        print(f"File not found: {trace_file}")
        sys.exit(1)

    if not span_durations:
        print(f"No valid spans found in {trace_file}")
        sys.exit(0)

    print(f"{'Span Name':<25} | {'Count':<6} | {'Avg (ms)':<10} | {'Min (ms)':<10} | {'Max (ms)':<10}")
    print("-" * 70)

    # Sort by average duration descending
    stats = []
    for name, durations in span_durations.items():
        avg_d = sum(durations) / len(durations)
        min_d = min(durations)
        max_d = max(durations)
        stats.append((name, span_counts[name], avg_d, min_d, max_d))

    stats.sort(key=lambda x: x[2], reverse=True)

    for name, count, avg_d, min_d, max_d in stats:
        print(f"{name:<25} | {count:<6} | {avg_d:<10.2f} | {min_d:<10.2f} | {max_d:<10.2f}")

if __name__ == "__main__":
    main()
