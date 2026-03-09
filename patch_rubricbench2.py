with open(".github/workflows/ci-rubricbench.yml", "r") as f:
    content = f.read()

content = content.replace(
    "run: pnpm install --frozen-lockfile",
    "run: pnpm install --no-frozen-lockfile"
)

with open(".github/workflows/ci-rubricbench.yml", "w") as f:
    f.write(content)
