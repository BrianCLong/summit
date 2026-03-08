#!/usr/bin/env python3
import os
import re
import argparse
import json
import sys
from pathlib import Path

# Patterns to detect OpenAI Assistants API usage
DENYLIST_PATTERNS = [
    (r"/v1/assistants\b", "Endpoint /v1/assistants"),
    (r"/v1/threads\b", "Endpoint /v1/threads"),
    (r"(?<!maestro)/v1/runs\b", "Endpoint /v1/runs (excluding maestro)"),
    (r"\bbeta\.assistants\b", "SDK beta.assistants"),
    (r"\bbeta\.threads\b", "SDK beta.threads"),
    (r"\bbeta\.runs\b", "SDK beta.runs"),
    (r"OpenAI-Beta:\s*assistants", "Header OpenAI-Beta: assistants"),
]

# Default exclusions
DEFAULT_EXCLUDES = {
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".pytest_cache",
    "__pycache__",
    "artifacts",
}

def scan_file(filepath, patterns):
    matches = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            for pattern, description in patterns:
                if re.search(pattern, content):
                    # Find line numbers
                    for i, line in enumerate(content.splitlines(), 1):
                        if re.search(pattern, line):
                            matches.append({
                                "pattern": pattern,
                                "description": description,
                                "line": i,
                                "match": line.strip()[:100]  # Truncate long lines
                            })
    except Exception as e:
        # print(f"Warning: Could not read file {filepath}: {e}", file=sys.stderr)
        pass
    return matches

def scan_directory(root_dir, excludes, patterns):
    results = []
    root_path = Path(root_dir)

    for path in root_path.rglob("*"):
        if path.is_file():
            # Check exclusions
            parts = path.parts
            if any(ex in parts for ex in excludes):
                continue
            if path.name == os.path.basename(__file__):
                continue

            file_matches = scan_file(path, patterns)
            if file_matches:
                results.append({
                    "file": str(path),
                    "matches": file_matches
                })
    return results

def main():
    parser = argparse.ArgumentParser(description="Scan for OpenAI Assistants API usage.")
    parser.add_argument("--root", default=".", help="Root directory to scan")
    parser.add_argument("--report", default="denylist_report.json", help="Path to output JSON report")
    parser.add_argument("--fail-on-match", action="store_true", help="Exit with error if matches found")
    args = parser.parse_args()

    print(f"Scanning {args.root} for OpenAI Assistants API usage...")
    results = scan_directory(args.root, DEFAULT_EXCLUDES, DENYLIST_PATTERNS)

    report = {
        "scan_root": args.root,
        "total_files_with_matches": len(results),
        "results": results
    }

    with open(args.report, "w") as f:
        json.dump(report, f, indent=2)

    print(f"Report saved to {args.report}")

    if results:
        print(f"Found {len(results)} files with forbidden patterns:")
        for res in results:
            print(f"  {res['file']} ({len(res['matches'])} matches)")

        if args.fail_on_match:
            sys.exit(1)
    else:
        print("No forbidden patterns found.")

if __name__ == "__main__":
    main()
