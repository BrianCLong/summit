import yaml
import sys

try:
    with open('.github/workflows/stabilization.yml', 'r') as f:
        yaml.safe_load(f)
    print("Valid YAML")
except Exception as e:
    print(f"Invalid YAML: {e}")
    sys.exit(1)
