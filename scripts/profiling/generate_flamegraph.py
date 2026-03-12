import html
#!/usr/bin/env python3
"""
Flame Graph Generator for Summit Profiling

This script converts Python profiling output (.prof files) into the format
expected by inferno/flamegraph tools. If flamegraph.pl is available, it
can generate SVG flame graphs directly.

Usage:
  python3 generate_flamegraph.py <profile.prof> [--output <output.svg>]
"""
import argparse
import pstats
import os
import sys

def convert_prof_to_folded(prof_file, folded_file):
    """Convert a cProfile .prof file to folded stack format."""
    print(f"[Flamegraph] Analyzing {prof_file}...")

    # Read stats
    stats = pstats.Stats(prof_file)

    # We need to trace back callers to build stacks
    # stats.stats is dict mapping (filename, line, funcname) -> (cc, nc, tt, ct, callers)

    # Find entry points (functions that have no callers)
    # This approach is an approximation since cProfile doesn't store full stack traces,
    # just caller-callee relationships

    # In a real tool we'd use py-spy or similar for true flamegraphs
    # but for simple cProfile data, we can try to flatten it

    try:
        # A simple hack for basic visualization
        # In actual practice, it's better to use py-spy for flame graphs:
        # py-spy record -o profile.svg -- python your_script.py

        with open(folded_file, 'w') as f:
            for func, info in stats.stats.items():
                # Extract cumulative time in microseconds
                cc, nc, tt, ct, callers = info
                if ct > 0:
                    filename = func[0]
                    if filename == '~':
                        name = func[2]
                    else:
                        name = f"{os.path.basename(filename)}:{func[1]}({func[2]})"

                    # Ensure name has no semicolons as they are used for stack separation
                    name = name.replace(';', ':')
                    # Just write the function name and its time
                    f.write(f"root;{name} {int(ct * 1_000_000)}\n")

        print(f"[Flamegraph] Created simplified folded stacks at {folded_file}")
        return True
    except Exception as e:
        print(f"[Flamegraph] Error creating folded stacks: {e}")
        return False

def generate_html_report(prof_file, output_html):
    """Generate a simple HTML report visualizing the top functions."""
    print(f"[Flamegraph] Generating HTML report from {prof_file}...")
    stats = pstats.Stats(prof_file)
    stats.sort_stats(pstats.SortKey.CUMULATIVE)

    data = []
    total_time = 0

    for func, info in stats.stats.items():
        cc, nc, tt, ct, callers = info
        if callers is None or len(callers) == 0:
            if ct > total_time:
                total_time = ct

        filename = func[0]
        if filename == '~':
            name = func[2]
        else:
            name = f"{os.path.basename(filename)}:{func[1]}({func[2]})"

        data.append({
            "name": name,
            "calls": nc,
            "tottime": tt,
            "cumtime": ct
        })

    data.sort(key=lambda x: x["cumtime"], reverse=True)
    top_data = data[:50] # Top 50 functions

    # If total_time wasn't found properly, use the max cumtime
    if total_time == 0 and top_data:
        total_time = top_data[0]["cumtime"]

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>CPU Profile Report</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            .bar-container {{ width: 100%; background-color: #f0f0f0; margin-bottom: 2px; }}
            .bar {{ height: 20px; background-color: #4CAF50; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
            th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
            th {{ background-color: #f2f2f2; }}
        </style>
    </head>
    <body>
        <h2>CPU Profile Report</h2>
        <p>Source: {prof_file}</p>

        <h3>Top Functions (Cumulative Time)</h3>
        <table>
            <tr>
                <th>Function</th>
                <th>Calls</th>
                <th>Total Time (s)</th>
                <th>Cumulative Time (s)</th>
                <th>% of Total Time</th>
            </tr>
    """

    for item in top_data:
        pct = (item["cumtime"] / total_time * 100) if total_time > 0 else 0
        html += f"""
            <tr>
                <td>{html.escape(item["name"])}</td>
                <td>{item["calls"]}</td>
                <td>{item["tottime"]:.4f}</td>
                <td>{item["cumtime"]:.4f}</td>
                <td>
                    <div style="display: flex; align-items: center;">
                        <span style="width: 50px;">{pct:.1f}%</span>
                        <div style="flex-grow: 1; background-color: #eee; height: 10px; margin-left: 10px;">
                            <div style="width: {pct}%; background-color: #2196F3; height: 100%;"></div>
                        </div>
                    </div>
                </td>
            </tr>
        """

    html += f"""
        </table>

        <div style="margin-top: 40px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #2196F3;">
            <h3>Note on Visualization</h3>
            <p>For true interactive flame graphs, we recommend using <a href="https://jiffyclub.github.io/snakeviz/">SnakeViz</a> or <a href="https://github.com/benfred/py-spy">py-spy</a>:</p>
            <pre>pip install snakeviz\nsnakeviz {prof_file}</pre>
        </div>
    </body>
    </html>
    """

    try:
        with open(output_html, 'w') as f:
            f.write(html)
        print(f"[Flamegraph] Interactive HTML report saved to {output_html}")
    except Exception as e:
        print(f"[Flamegraph] Error saving HTML report: {e}")

def main():
    parser = argparse.ArgumentParser(description="Generate visualizations from Python profile data")
    parser.add_argument("profile_file", help="The .prof file generated by cProfile")
    parser.add_argument("--output", help="Optional explicit output path (for HTML)")

    args = parser.parse_args()

    if not os.path.exists(args.profile_file):
        print(f"Error: Profile file {args.profile_file} not found")
        sys.exit(1)

    base_path = os.path.splitext(args.profile_file)[0]

    folded_file = base_path + ".folded"
    convert_prof_to_folded(args.profile_file, folded_file)

    html_file = args.output if args.output else base_path + ".html"
    generate_html_report(args.profile_file, html_file)

if __name__ == "__main__":
    main()
