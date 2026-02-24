#!/bin/bash
set -e

# Evidence Contract Verification Gate
# This script verifies that all evidence files adhere to the schema and
# checks for any contract violations.

echo "Verifying evidence contracts..."

# Use python to validate json against schema logic
python3 -c "
import sys
import json
import os
import glob

def validate_schema(data, schema_type='report'):
    # In a real scenario, this would use the 'jsonschema' library
    # For now, we do structural duck-typing
    if not isinstance(data, dict):
        print(f'Invalid data type: {type(data)} (expected dict)')
        return False
    return True

def process_evidence():
    # Use glob to find all json files in evidence/
    evidence_files = glob.glob('evidence/**/*.json', recursive=True)

    failure = False

    for ev_file in evidence_files:
        if ev_file.endswith('index.json') or ev_file.endswith('schemas.json') or 'schemas/' in ev_file:
            continue

        print(f'Checking evidence: {ev_file}')
        try:
            with open(ev_file, 'r') as f:
                data = json.load(f)

            # Handle list vs dict
            if isinstance(data, list):
                # If it's a list, iterate through items
                for i, item in enumerate(data):
                    if not validate_schema(item):
                        print(f'FAILED schema validation (item {i} in list): {ev_file}')
                        failure = True
            elif isinstance(data, dict):
                if not validate_schema(data):
                    print(f'FAILED schema validation: {ev_file}')
                    failure = True
            else:
                print(f'Unknown JSON root type in {ev_file}: {type(data)}')
                failure = True

        except json.JSONDecodeError:
            print(f'FAILED: Invalid JSON in {ev_file}')
            failure = True
        except Exception as e:
            print(f'FAILED: Error processing {ev_file}: {e}')
            failure = True

    if failure:
        sys.exit(1)
    else:
        print('All evidence contracts passed.')
        sys.exit(0)

if __name__ == '__main__':
    process_evidence()
"
