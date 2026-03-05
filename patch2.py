import re

with open('.github/workflows/comprehensive-test.yml') as f:
    content = f.read()

# Add corepack
content = re.sub(
    r"run: pnpm install --frozen-lockfile",
    "run: |\n          corepack enable\n          corepack prepare pnpm@latest --activate\n          pnpm install --frozen-lockfile",
    content
)

with open('.github/workflows/comprehensive-test.yml', 'w') as f:
    f.write(content)
