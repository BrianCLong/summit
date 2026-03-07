import glob
import os
import re


def fix_file(filepath):
    with open(filepath) as f:
        content = f.read()

    # Pattern: req.query.param -> (req.query.param as string)
    # But only if it's being used in a context that expects string (which we can't easily know)
    # However, standardizing on casting to string for query params in these files is safe enough for this task.
    # We will target common patterns.

    # Fix: parseInt(req.query.limit) -> parseInt(req.query.limit as string)
    content = re.sub(r'parseInt\(req\.query\.(\w+)', r'parseInt(req.query.\1 as string', content)

    # Fix: const x: string = req.query.y -> const x: string = req.query.y as string
    # This is hard to regex.

    # Let's fix specific known failing lines based on variable names like limit, offset, cursor, id
    params = ['limit', 'offset', 'cursor', 'id', 'token', 'type', 'status', 'userId']
    for p in params:
        # req.query.p -> (req.query.p as string)
        # Avoid double casting
        if f'req.query.{p} as string' not in content:
            content = re.sub(f'req\.query\.{p}(?![a-zA-Z0-9_])', f'(req.query.{p} as string)', content)

    with open(filepath, 'w') as f:
        f.write(content)

# Walk through server/src/routes and apply fixes
for root, dirs, files in os.walk("server/src/routes"):
    for file in files:
        if file.endswith(".ts"):
            fix_file(os.path.join(root, file))

# Also fix the other reported files
other_files = [
    "server/src/search-index/SearchIndexService.ts",
    "server/src/security/vulnerability-dashboard-api.ts",
    "server/src/services/GraphStore.ts",
    "server/src/services/HighRiskOperationService.ts",
    "server/src/services/ToolbusService.ts",
    "server/src/services/brand-packs/brand-pack.routes.ts",
    "server/src/shared/logging/index.ts",
    "server/src/siem/SIEMPlatform.ts"
]

for f in other_files:
    if os.path.exists(f):
        fix_file(f)
