#!/usr/bin/env python3
import json
import sys

import yaml
from jsonschema import ValidationError, validate

s = json.load(open("orchestration.schema.json"))
d = yaml.safe_load(open("orchestration.yml"))
try:
    validate(d, s)
    print("orchestration.yml ✓")
except ValidationError as e:
    print("✖ orchestration.yml:", e.message)
    sys.exit(1)
