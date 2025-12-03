#!/usr/bin/env python3
from ruamel.yaml import YAML; import sys,json
y=YAML(); doc=y.load(sys.stdin.read()); print(json.dumps(doc))
