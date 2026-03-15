import re

content = ""
with open("pnpm-workspace.yaml", "r") as f:
    content = f.read()

content = content.replace("packages:\n  - 'packages/*'\n  - 'services/*'\n  - 'services/*/*'\n  - 'apps/*'\n\n  - 'libs/*'\n\n  - 'tools/*'\n  - 'platform/*'\n  - 'agents/*'\n  - 'cli'\n  - 'client'\n  - 'server'", "packages:\n  - 'packages/*'\n  - 'services/*'\n  - 'services/*/*'\n  - 'apps/*'\n  - 'libs/*'\n  - 'libs/*/*'\n  - 'tools/*'\n  - 'platform/*'\n  - 'agents/*'\n  - 'cli'\n  - 'client'\n  - 'server'")

with open("pnpm-workspace.yaml", "w") as f:
    f.write(content)
