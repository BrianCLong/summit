with open(".github/workflows/ci-rubricbench.yml", "r") as f:
    content = f.read()

content = content.replace(
    "- name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: ${{ matrix.node-version }}\n      - name: Install dependencies\n        run: pnpm install --frozen-lockfile",
    "- uses: pnpm/action-setup@v4\n        with:\n          version: 10.0.0\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: ${{ matrix.node-version }}\n          cache: 'pnpm'\n      - name: Install dependencies\n        run: pnpm install --frozen-lockfile"
)

with open(".github/workflows/ci-rubricbench.yml", "w") as f:
    f.write(content)
