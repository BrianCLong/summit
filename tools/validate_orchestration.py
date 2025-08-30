#!/usr/bin/env python3
import json, sys, yaml
from jsonschema import validate, ValidationError
s = json.load(open("orchestration.schema.json"))
d = yaml.safe_load(open("orchestration.yml"))
try:
  validate(d, s); print("orchestration.yml ✓")
except ValidationError as e:
  print("✖ orchestration.yml:", e.message); sys.exit(1)
