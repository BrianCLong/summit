#!/usr/bin/env python3
"""
CPU Profiling Script for Summit

This script uses cProfile to profile CPU usage of Python code.
It generates a performance profile and can optionally produce data for flame graphs.

Usage:
  python3 profile_cpu.py --target <module.path> [args...]
  python3 profile_cpu.py --script <script_path.py> [args...]
"""
import argparse
import cProfile
import pstats
import io
import os
import sys
import runpy
import json
from datetime import datetime

def analyze_profile(profiler, output_dir, safe_name, timestamp):
    """Analyze and save profile data."""
    # Convert profile data to pstats object
    s = io.StringIO()
    # Sort by cumulative time
    sortby = pstats.SortKey.CUMULATIVE
    ps = pstats.Stats(profiler, stream=s).sort_stats(sortby)

    # Print the top 20 functions
    print(f"\n[CPU Profile] Top 20 functions by cumulative time:")
    ps.print_stats(20)
    print(s.getvalue())

    # Save textual report
    report_file = os.path.join(output_dir, f"cpu_profile_{safe_name}_{timestamp}.txt")
    try:
        os.makedirs(os.path.dirname(report_file), exist_ok=True)
        with open(report_file, 'w') as f:
            f.write(s.getvalue())
        print(f"[CPU Profile] Text report saved to {report_file}")
    except Exception as e:
        print(f"[CPU Profile] Error saving text report: {e}")

    # Save raw stats file for tools like snakeviz
    stats_file = os.path.join(output_dir, f"cpu_profile_{safe_name}_{timestamp}.prof")
    try:
        ps.dump_stats(stats_file)
        print(f"[CPU Profile] Raw stats saved to {stats_file} (can be viewed with snakeviz)")
    except Exception as e:
        print(f"[CPU Profile] Error saving raw stats: {e}")

    # Generate simple JSON call graph data for custom visualizations
    cg_file = os.path.join(output_dir, f"call_graph_{safe_name}_{timestamp}.json")
    try:
        data = []
        # Access the raw stats dictionary
        for func, info in ps.stats.items():
            # func is (filename, line_num, function_name)
            # info is (cc, nc, tt, ct, callers)
            cc, nc, tt, ct, callers = info

            filename = func[0]
            if filename == '~':
                # Built-in or C function
                name = func[2]
            else:
                name = f"{os.path.basename(filename)}:{func[1]}({func[2]})"

            data.append({
                "function": name,
                "ncalls": nc,
                "tottime": tt,
                "cumtime": ct,
                "percall_tottime": tt / nc if nc > 0 else 0,
                "percall_cumtime": ct / cc if cc > 0 else 0
            })

        # Sort by cumulative time
        data.sort(key=lambda x: x["cumtime"], reverse=True)

        with open(cg_file, 'w') as f:
            json.dump(data[:100], f, indent=2)  # Save top 100
        print(f"[CPU Profile] Call graph data saved to {cg_file}")
    except Exception as e:
        print(f"[CPU Profile] Error saving call graph data: {e}")

def profile_target(run_func, target_name, args, output_dir="artifacts/profiling"):
    """Run the target function with CPU profiling enabled."""
    print(f"[CPU Profile] Starting CPU profiling for {target_name}")

    # Store old argv and setup new one
    old_argv = sys.argv.copy()
    sys.argv = [target_name] + args

    profiler = cProfile.Profile()

    try:
        # Run the target
        profiler.enable()
        run_func()
    except SystemExit as e:
        # Ignore normal exits
        if e.code != 0:
            print(f"[CPU Profile] Target exited with code {e.code}")
    except Exception as e:
        print(f"[CPU Profile] Error running target: {e}")
    finally:
        profiler.disable()

        # Restore argv
        sys.argv = old_argv

        print(f"\n[CPU Profile] Profiling complete. Analyzing results...")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = os.path.basename(target_name).replace('.', '_')
        analyze_profile(profiler, output_dir, safe_name, timestamp)

def main():
    parser = argparse.ArgumentParser(description="Profile CPU usage of a Python script or module")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--script", help="Path to Python script to profile")
    group.add_argument("--module", help="Name of Python module to profile (e.g. summit.graph.operations)")
    parser.add_argument("--output-dir", default="artifacts/profiling", help="Directory to save profiling reports")

    # Capture remaining arguments to pass to the target
    args, unknown_args = parser.parse_known_args()

    if args.script:
        target_path = os.path.abspath(args.script)
        if not os.path.exists(target_path):
            print(f"Error: Script {target_path} not found")
            sys.exit(1)

        def run_script():
            # Add script directory to sys.path to allow imports to work as expected
            sys.path.insert(0, os.path.dirname(target_path))
            runpy.run_path(target_path, run_name="__main__")

        profile_target(run_script, target_path, unknown_args, args.output_dir)

    elif args.module:
        def run_module():
            runpy.run_module(args.module, run_name="__main__", alter_sys=True)

        profile_target(run_module, args.module, unknown_args, args.output_dir)

if __name__ == "__main__":
    main()
