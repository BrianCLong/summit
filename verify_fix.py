import json
import sys
import os

# Check JSON
try:
    with open('evidence/index.json', 'r') as f:
        json.load(f)
    print("evidence/index.json is valid JSON.")
except Exception as e:
    print(f"evidence/index.json is INVALID: {e}")
    sys.exit(1)

# Check Python Import
try:
    sys.path.append(os.getcwd())
    from summit.precision import detectors
    print(f"Successfully imported detectors. torch is {detectors.torch}")
except ImportError as e:
    print(f"Failed to import detectors: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Error importing detectors: {e}")
    sys.exit(1)
