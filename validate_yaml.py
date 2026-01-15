import sys

import yaml

try:
    with open(".github/workflows/stabilization.yml") as f:
        yaml.safe_load(f)
    print("Valid YAML")
except Exception as e:
    print(f"Invalid YAML: {e}")
    sys.exit(1)
