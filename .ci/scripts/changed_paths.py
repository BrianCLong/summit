import json
import os
import pathlib

# Derive changed paths for PR; fallback to repo scan if not available
base = pathlib.Path(".")
node, python = set(), set()
# Heuristics: presence of package.json => node, requirements.txt/pyproject => python
for root, dirs, files in os.walk("."):
    if "node_modules" in root or ".git" in root:
        continue
    fs = set(files)
    if "package.json" in fs:
        node.add(root)
    if "requirements.txt" in fs or "pyproject.toml" in fs:
        python.add(root)
print(json.dumps({"node": sorted(node), "python": sorted(python)}))
