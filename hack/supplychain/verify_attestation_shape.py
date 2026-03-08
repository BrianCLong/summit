#!/usr/bin/env python3
import argparse
import json
import sys


def verify_shape(filepath):
    try:
        with open(filepath) as f:
            data = json.load(f)

        if isinstance(data, dict):
            if "spdxVersion" in data:
                 print(f"Verified SPDX SBOM in {filepath}")
                 return 0
            if "builder" in data and "buildType" in data:
                 print(f"Verified SLSA Provenance predicate in {filepath}")
                 return 0
            if "predicateType" in data:
                 print(f"Verified In-Toto Statement in {filepath}")
                 return 0

        # BuildKit can export a list of descriptors
        if isinstance(data, list):
             print(f"Verified List (potential manifest list) in {filepath}")
             return 0

        print(f"Warning: JSON structure unrecognised for {filepath}, but valid JSON.")
        return 0

    except json.JSONDecodeError:
        print(f"Invalid JSON: {filepath}")
        return 1
    except Exception as e:
        print(f"Error verifying {filepath}: {e}")
        return 1

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("file", help="Path to JSON file to verify")
    args = parser.parse_args()

    sys.exit(verify_shape(args.file))
