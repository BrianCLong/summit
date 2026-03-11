import re

with open('.github/workflows/ci.yml', 'r') as f:
    content = f.read()

# Replace missing pnpm command by prepending `npx ` before `pnpm test:`
content = re.sub(r'run: pnpm test:', 'run: npx pnpm test:', content)

# For cosign installer error (exit code 22 usually means 404 from curl -f)
content = re.sub(r'cosign-release:\s*v[0-9.]+', 'cosign-release: v3.1.1', content)

with open('.github/workflows/ci.yml', 'w') as f:
    f.write(content)
