#!/bin/bash
sed -i '12,14d' .github/workflows/mvp4-gate.yml
sed -i '12i \      - uses: pnpm/action-setup@v4\n      - name: Setup Node\n        uses: actions/setup-node@v4\n        with:\n          node-version: "20"\n          cache: "pnpm"' .github/workflows/mvp4-gate.yml
sed -i '42,45d' .github/workflows/mvp4-gate.yml
