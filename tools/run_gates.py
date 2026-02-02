#!/usr/bin/env python3
import json
import sys
import os
import argparse

GATES_POLICY_PATH = "policies/gates.json"

def load_gates():
    if not os.path.exists(GATES_POLICY_PATH):
        return {}
    with open(GATES_POLICY_PATH, 'r') as f:
        return json.load(f)

def main():
    parser = argparse.ArgumentParser(description="Run gates evaluation")
    parser.add_argument("--input", help="Path to input signals json")
    args = parser.parse_args()

    # Deny by default: if no input provided, fail.
    if not args.input:
        print("Error: No input signals provided. Deny by default.")
        sys.exit(1)

    if not os.path.exists(args.input):
        print(f"Error: Input file {args.input} not found. Deny by default.")
        sys.exit(1)

    try:
        with open(args.input, 'r') as f:
            data = json.load(f)

        # Check if empty dictionary or list
        if not data:
            print("Error: Empty input signals. Deny by default.")
            sys.exit(1)

    except json.JSONDecodeError:
        print("Error: Invalid JSON in input file. Deny by default.")
        sys.exit(1)

    print("Inputs provided. (Stub) Gates passed.")
    sys.exit(0)

if __name__ == "__main__":
    main()
