import os

with open('.github/workflows/ci.yml', 'r') as f:
    content = f.read()

# Replace any other npm install commands that might exist and cause EUNSUPPORTEDPROTOCOL
content = content.replace("npm install js-yaml", "pnpm install js-yaml")

with open('.github/workflows/ci.yml', 'w') as f:
    f.write(content)
