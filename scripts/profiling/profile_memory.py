#!/usr/bin/env python3
"""
Memory Profiling Script for Summit

This script uses tracemalloc to profile memory usage of Python code.
It is specifically designed to help identify memory leaks and high memory usage
in the GraphRAG pipeline and other components.

Usage:
  python3 profile_memory.py --target <module.path> [args...]
  python3 profile_memory.py --script <script_path.py> [args...]
"""
import argparse
import importlib
import runpy
import sys
import tracemalloc
import gc
import json
import os
from datetime import datetime

def analyze_snapshots(snapshot1, snapshot2, top_stats=20):
    """Compare two snapshots and print the differences."""
    stats = snapshot2.compare_to(snapshot1, 'lineno')

    print(f"\n[Memory Profile] Top {top_stats} memory allocations (differences):")
    for stat in stats[:top_stats]:
        print(stat)

    print(f"\n[Memory Profile] Top {top_stats} memory allocations (current):")
    current_stats = snapshot2.statistics('lineno')
    for stat in current_stats[:top_stats]:
        print(stat)

    return stats

def save_report(stats, output_file):
    """Save the profiling report to a file."""
    try:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w') as f:
            for stat in stats:
                f.write(f"{stat}\n")
        print(f"\n[Memory Profile] Report saved to {output_file}")
    except Exception as e:
        print(f"\n[Memory Profile] Error saving report: {e}")

def profile_target(run_func, target_name, args, output_dir="artifacts/profiling"):
    """Run the target function with memory profiling enabled."""
    print(f"[Memory Profile] Starting memory profiling for {target_name}")
    print(f"[Memory Profile] Initializing tracemalloc...")

    # Store old argv and setup new one
    old_argv = sys.argv.copy()
    sys.argv = [target_name] + args

    tracemalloc.start(10) # Save 10 frames

    # Take initial snapshot before running
    gc.collect()
    snapshot1 = tracemalloc.take_snapshot()

    try:
        # Run the target
        run_func()
    except SystemExit as e:
        # Ignore normal exits
        if e.code != 0:
            print(f"[Memory Profile] Target exited with code {e.code}")
    except Exception as e:
        print(f"[Memory Profile] Error running target: {e}")
    finally:
        # Take final snapshot
        gc.collect()
        snapshot2 = tracemalloc.take_snapshot()

        # Restore argv
        sys.argv = old_argv

        print(f"\n[Memory Profile] Profiling complete. Analyzing results...")

        # Analyze
        stats = analyze_snapshots(snapshot1, snapshot2)

        # Save report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = os.path.basename(target_name).replace('.', '_')
        report_file = os.path.join(output_dir, f"memory_profile_{safe_name}_{timestamp}.txt")
        save_report(stats, report_file)

        # Optional: Save heap dump for external analysis
        dump_file = os.path.join(output_dir, f"heap_dump_{safe_name}_{timestamp}.json")
        try:
            os.makedirs(os.path.dirname(dump_file), exist_ok=True)
            # A simple representation of top allocations for JSON export
            current_stats = snapshot2.statistics('lineno')
            dump_data = [
                {
                    "file": stat.traceback[0].filename,
                    "line": stat.traceback[0].lineno,
                    "size_bytes": stat.size,
                    "count": stat.count
                }
                for stat in current_stats[:100]
            ]
            with open(dump_file, 'w') as f:
                json.dump(dump_data, f, indent=2)
            print(f"[Memory Profile] Heap summary saved to {dump_file}")
        except Exception as e:
            print(f"[Memory Profile] Error saving heap dump: {e}")

        tracemalloc.stop()

def main():
    parser = argparse.ArgumentParser(description="Profile memory usage of a Python script or module")
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
