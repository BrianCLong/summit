import json

with open("package.json") as f:
    pkg = json.load(f)

# Need to set packageManager if it isn't set.
if "packageManager" not in pkg:
    pkg["packageManager"] = "pnpm@10.0.0"
else:
    # Also fix it to not just have pnpm without version
    pkg["packageManager"] = "pnpm@10.0.0"

with open("package.json", "w") as f:
    json.dump(pkg, f, indent=2)
