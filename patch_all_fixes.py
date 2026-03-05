import glob
import json
import os

# 1. CHANGELOG
with open("CHANGELOG.md") as f:
    content = f.read()
new_changelog = content.replace("### Added", "### Added\n- Added Agentic Runtime, deterministic RAG eval harness, and Governance components.\n", 1)
with open("CHANGELOG.md", "w") as f:
    f.write(new_changelog)

# 2. Package.json Versions
with open("package.json") as f:
    root_pkg = json.load(f)
    version = root_pkg["version"]

for path in ["client/package.json", "server/package.json"]:
    with open(path) as f:
        pkg = json.load(f)
    pkg["version"] = version
    with open(path, "w") as f:
        json.dump(pkg, f, indent=2)

# 3. Workflows Node Version & Docker Compose Path
for filename in glob.glob(".github/workflows/*.yml"):
    with open(filename) as f:
        content = f.read()

    # node version
    content = content.replace("node-version: 18", "node-version: 20")
    content = content.replace('node-version: "18"', 'node-version: "20"')
    content = content.replace("node-version: '18'", "node-version: '20'")

    # docker compose path
    content = content.replace("compose-file: .github/compose/pg_neo.yml", "compose-file: ops/docker-compose.yml")

    with open(filename, "w") as f:
        f.write(content)

os.makedirs("artifacts/graph-sync", exist_ok=True)
with open("artifacts/graph-sync/empty.json", "w") as f:
    f.write("{}")
