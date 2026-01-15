#!/usr/bin/env python3
import json
import sys

from ruamel.yaml import YAML

y = YAML()
doc = y.load(sys.stdin.read())
print(json.dumps(doc))
